package performance

import (
	"context"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
)

type Transactor interface {
	Read(ctx context.Context, fn func(ctx context.Context) error) error
	Write(ctx context.Context, fn func(ctx context.Context) error) error
}

type SourceView struct {
	Source
	LastLoadedAt   time.Time
	DataThrough    time.Time
	FactCount      int
	LastLoadFailed bool
}

// SourceUse counts what still refers to a source, each of which keeps it from being deleted.
type SourceUse struct {
	Facts          int
	Imports        int
	ReviewRows     int
	IntegrationIDs int
}

func (u SourceUse) IsUsed() bool {
	return u.Facts+u.Imports+u.ReviewRows+u.IntegrationIDs > 0
}

type Supplier struct {
	MappingID  string
	SourceID   string
	SourceName string
	Meaning    Meaning
	Stage      string
}

type FactView struct {
	Fact
	SourceName string
}

type ReviewRowView struct {
	ReviewRow
	SourceName string
}

// Sources and mappings are organisation-wide configuration, so they carry no scope.
type Sources interface {
	ListSources(ctx context.Context, id string) ([]SourceView, error)
	PutSource(ctx context.Context, s Source) error
	SourceUse(ctx context.Context, id string) (SourceUse, error)
	DeleteSource(ctx context.Context, id string) (bool, error)
	ListMappings(ctx context.Context, sourceIDs []string) ([]Mapping, error)
	PutMapping(ctx context.Context, m Mapping) error
	DeleteMapping(ctx context.Context, id string) error
	ActiveSuppliers(ctx context.Context, modelID string) ([]Supplier, error)
}

// Matching resolves a whole batch's distinct keys in one query per key type, never one per row (research
// R2, plan R16). Each answer maps a key to every activity it reached: more than one means ambiguous, and
// the matcher refuses to guess.
type Matching interface {
	MatchByActivityID(ctx context.Context, scope authz.Scope, keys []string) (map[string][]string, error)
	MatchByMediaCode(ctx context.Context, scope authz.Scope, codes []int64) (map[string][]string, error)
	MatchByIntegrationID(ctx context.Context, scope authz.Scope, sourceID string, keys []string) (map[string][]string, error)
	MatchByExternalName(ctx context.Context, scope authz.Scope, keys []string) (map[string][]string, error)
}

type Facts interface {
	ListFactsForActivity(ctx context.Context, scope authz.Scope, q FactQuery) ([]FactView, error)
	PutFact(ctx context.Context, f Fact) error
	CurrentFacts(ctx context.Context, sourceID string, references []string) ([]Fact, error)
	ListFactsOfImport(ctx context.Context, importID string) ([]Fact, error)
	FactsReplacedBy(ctx context.Context, replacerIDs []string) ([]Fact, error)
	ActivityTotals(ctx context.Context, scope authz.Scope, activityID string, year int) ([]StageTotals, error)
	LatestImportStatuses(ctx context.Context, sourceIDs []string) (map[string]string, error)
	HeldActivityIDs(ctx context.Context, sourceID string) ([]string, error)
	ReleaseHeld(ctx context.Context, activityID string, by actor.Actor, at time.Time) (int, error)
	HoldFacts(ctx context.Context, activityID string, by actor.Actor, at time.Time) (int, error)
}

// ImportFilter is the imports' findability: by file and uploader (Search), source, status and date.
type ImportFilter struct {
	ID       string
	SourceID string
	Search   string
	Status   string
	Since    *time.Time
	Until    *time.Time
	Limit    int
}

type Imports interface {
	ListImports(ctx context.Context, f ImportFilter) ([]Import, error)
	PutImport(ctx context.Context, i Import) error
	PutBreakdown(ctx context.Context, importID string, groups []Breakdown) error
	Breakdowns(ctx context.Context, importIDs []string) (map[string][]Breakdown, error)
	CurrencyCodes(ctx context.Context) (map[string]bool, error)
}

type FactQuery struct {
	ActivityID  string
	Search      string
	CountedOnly bool
	Limit       int
}

// ReviewFilter is the review queue's findability: by key, source, reason, upload, date and status.
type ReviewFilter struct {
	ID        string
	Status    string
	StatusNot string
	SourceID  string
	ImportID  string
	Reason    string
	KeyText   string
	Since     *time.Time
	Until     *time.Time
	Limit     int
	// ByID orders by id alone, so AfterID can page through every row whatever changes behind the cursor.
	ByID    bool
	AfterID string
}

type Review interface {
	ListReviewRows(ctx context.Context, f ReviewFilter) ([]ReviewRowView, error)
	PutReviewRow(ctx context.Context, r ReviewRow) error
}

type Keys interface {
	ActivityKeyFacts(ctx context.Context, scope authz.Scope, activityID string) (KeyFacts, bool, error)
	FactTotalsBySource(ctx context.Context, activityID string) ([]SourceTotals, error)
	ListAliases(ctx context.Context, activityID string) ([]Alias, error)
	ListIntegrationIDs(ctx context.Context, activityID string) ([]IntegrationID, error)
	RemoveAlias(ctx context.Context, activityID, aliasID string) (bool, error)
	RemoveIntegrationID(ctx context.Context, activityID, sourceID string) (bool, error)
}

type Codes interface {
	ListMediaCodes(ctx context.Context, scope authz.Scope, activityID string) ([]MediaCode, error)
	PutMediaCode(ctx context.Context, c MediaCode) error
	PutIntegrationID(ctx context.Context, k IntegrationID) error
	TakeNextCode(ctx context.Context, by actor.Actor, at time.Time) (int64, error)
	MediaCodeUsed(ctx context.Context, code int64) (bool, error)
	GetConfiguration(ctx context.Context) (Configuration, bool, error)
	PutConfiguration(ctx context.Context, c Configuration) error
}

// Children serves the recycle bin, which collects an activity's records before deleting it.
type Children interface {
	FactIDsOf(ctx context.Context, activityIDs []string) ([]string, error)
	MediaCodeIDsOf(ctx context.Context, activityIDs []string) ([]string, error)
	AliasIDsOf(ctx context.Context, activityIDs []string) ([]string, error)
	IntegrationIDsOf(ctx context.Context, activityIDs []string) ([]string, error)
	GetFact(ctx context.Context, id string) (Fact, bool, error)
	GetMediaCode(ctx context.Context, id string) (MediaCode, bool, error)
	GetAlias(ctx context.Context, id string) (Alias, bool, error)
	GetIntegrationID(ctx context.Context, id string) (IntegrationID, bool, error)
	DeleteFacts(ctx context.Context, ids []string) error
	DeleteMediaCodes(ctx context.Context, ids []string) error
	DeleteAliases(ctx context.Context, ids []string) error
	DeleteIntegrationIDs(ctx context.Context, ids []string) error
	PutAlias(ctx context.Context, a Alias) error
	ExternalNameHolders(ctx context.Context, name string) ([]string, error)
}

type Store interface {
	Children
	Sources
	Matching
	Facts
	Imports
	Review
	Codes
	Keys
}
