package performance

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"mapp/internal/history"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
)

const (
	msgRestoreAliasHeld       = "Can't restore — '%s' is now the external name or alias of activity %s. Remove it there first."
	msgRestoreIntegrationHeld = "Can't restore — activity %s now has the integration ID '%s' for this data source. Remove it there first."
	msgRestoreSourceGone      = "Can't restore — its data source was deleted. Restore the data source from the recycle bin first."
	noteUndoneUpload          = "Performance data of an undone upload was left out."
	noteReloaded              = "Performance data loaded again since the delete stays current; the older figures come back as replaced."
)

// prepareFact leaves out a fact whose upload was undone while it was in the bin, and keeps a newer load of the
// same identity current. A restore returns the activity to Created, so its facts come back held.
func (s *Service) prepareFact(ctx context.Context, rc history.RestoreContext, f Fact) (Fact, string, bool, error) {
	if err := s.sourceStillThere(ctx, f.SourceID); err != nil {
		return f, "", false, err
	}
	run, err := s.importByID(ctx, f.ImportID)
	if err != nil {
		return f, "", false, err
	}
	if run.Status == ImportUndone {
		return f, noteUndoneUpload, true, nil
	}
	f.Held = f.Held || !rc.Undo
	kept, note, err := s.behindALaterLoad(ctx, rc, f)
	return kept, note, false, err
}

func (s *Service) behindALaterLoad(ctx context.Context, rc history.RestoreContext, f Fact) (Fact, string, error) {
	if f.ReplacedByID != "" {
		return f, "", nil
	}
	current, err := s.repo.CurrentFacts(ctx, f.SourceID, []string{f.SourceReference})
	if err != nil {
		return f, "", err
	}
	for _, c := range current {
		if c.Stage == f.Stage && c.WebMetric == f.WebMetric {
			f.ReplacedByID = c.ID
			f.Touch(rc.Actor, rc.Now)
			return f, noteReloaded, nil
		}
	}
	return f, "", nil
}

func (s *Service) prepareAlias(ctx context.Context, _ history.RestoreContext, a Alias) (Alias, string, bool, error) {
	holders, err := s.repo.ExternalNameHolders(ctx, strings.TrimSpace(a.Name))
	if err != nil {
		return a, "", false, err
	}
	for _, holder := range holders {
		if holder != a.ActivityID {
			return a, "", false, errs.CannotRestore(fmt.Sprintf(msgRestoreAliasHeld, a.Name, holder))
		}
	}
	return a, "", false, nil
}

func (s *Service) prepareIntegrationID(ctx context.Context, _ history.RestoreContext, k IntegrationID) (IntegrationID, string, bool, error) {
	if err := s.sourceStillThere(ctx, k.SourceID); err != nil {
		return k, "", false, err
	}
	matched, err := s.repo.MatchByIntegrationID(ctx, authz.Scope{Everything: true}, k.SourceID, []string{k.Value})
	if err != nil {
		return k, "", false, err
	}
	for _, holder := range matched[strings.ToLower(k.Value)] {
		if holder != k.ActivityID {
			return k, "", false, errs.CannotRestore(fmt.Sprintf(msgRestoreIntegrationHeld, holder, k.Value))
		}
	}
	return k, "", false, nil
}

func (s *Service) sourceStillThere(ctx context.Context, sourceID string) error {
	found, err := s.repo.ListSources(ctx, sourceID)
	if err == nil && len(found) == 0 {
		err = errs.CannotRestore(msgRestoreSourceGone)
	}
	return err
}

// prepareMappingRestore keeps "one active source per model stage or revenue" for a mapping coming back.
func (s *Service) prepareMappingRestore(ctx context.Context, _ history.RestoreContext, snapshot *history.Snapshot) ([]string, error) {
	m, err := mappingOf(snapshot)
	if err != nil {
		return nil, err
	}
	err = s.checkMappingSupplies(ctx, m)
	if apiErr, refused := errors.AsType[*errs.Error](err); refused && apiErr.Code == errs.CodeNotAllowed {
		return nil, errs.CannotRestore(apiErr.Message)
	}
	return nil, err
}
