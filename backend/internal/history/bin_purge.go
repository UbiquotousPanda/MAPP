package history

import (
	"context"
	"strconv"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/errs"
)

// Purge keeps only who deleted the entry for good and when; entries waiting for it can no longer be restored.
// It joins the caller's Write.
func (s *Service) Purge(ctx context.Context, a actor.Actor, entryID string) (PurgeResult, error) {
	var result PurgeResult
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		entry, err := s.unresolvedEntry(ctx, entryID)
		if err != nil {
			return err
		}
		if err = s.purge(ctx, a, entry, s.now()); err != nil {
			return err
		}
		_, err = s.appendEntry(ctx, a, Entry{
			Action:          ActionDeletedPermanently,
			Verb:            verbDeletedPermanently,
			RecordType:      entry.RecordType,
			RecordTypeLabel: entry.RecordTypeLabel,
			RecordID:        entry.RecordID,
			RecordName:      entry.RecordName,
			Path:            entry.Path, // the record is gone: its place when it was deleted
			Details:         contentsText(entry.Contents),
		})
		result = PurgeResult{
			RecordType:      entry.RecordType,
			RecordTypeLabel: entry.RecordTypeLabel,
			RecordID:        entry.RecordID,
			RecordName:      entry.RecordName,
		}
		return err
	})
	if err != nil {
		return PurgeResult{}, err
	}
	return result, nil
}

func (s *Service) purge(ctx context.Context, a actor.Actor, entry BinEntry, now time.Time) error {
	if err := s.runPurgeHooks(ctx, a, entry.Snapshots); err != nil {
		return err
	}
	entry.Resolution = &Resolution{How: string(ActionDeletedPermanently), By: a, At: now}
	entry.Snapshots = []Snapshot{}
	return s.repo.PutBinEntry(ctx, entry)
}

// purgeable keeps the entries still in the bin, of kinds this API knows, that the person acting may see.
func (s *Service) purgeable(ctx context.Context, entryIDs []string) ([]string, []LogItem, error) {
	all, err := s.repo.BinEntries(ctx)
	if err != nil {
		return nil, nil, err
	}
	byID := make(map[string]BinEntry, len(all))
	for _, e := range all {
		byID[e.ID] = e
	}
	var ids []string
	var items []LogItem
	for _, id := range entryIDs {
		entry, found := byID[id]
		delete(byID, id)
		if !found || entry.Resolution != nil || !s.knowsKindsOf(entry) || !s.canSeeBinEntry(ctx, entry) {
			continue
		}
		ids = append(ids, id)
		items = append(items, LogItem{
			RecordType: entry.RecordType, RecordTypeLabel: entry.RecordTypeLabel, RecordID: entry.RecordID,
			RecordName: entry.RecordName, Details: contentsText(entry.Contents),
		})
	}
	return ids, items, nil
}

// EmptyBin deletes for good the entries the person saw in the confirmation, in one Write; 0 when someone else
// emptied the bin first.
func (s *Service) EmptyBin(ctx context.Context, a actor.Actor, entryIDs []string) (EmptyResult, error) {
	if len(entryIDs) == 0 {
		return EmptyResult{}, errs.Validation(errs.FieldError{Field: "entryIds", Message: reloadMessage})
	}
	var purged []LogItem
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		var ids []string
		var err error
		if ids, purged, err = s.purgeable(ctx, entryIDs); err != nil || len(ids) == 0 {
			return err
		}
		resolution := Resolution{How: string(ActionDeletedPermanently), By: a, At: s.now()}
		if err = s.repo.PurgeBinEntries(ctx, ids, resolution); err != nil {
			return err
		}
		details := "1 item"
		if len(purged) > 1 {
			details = strconv.Itoa(len(purged)) + " items"
		}
		_, err = s.appendEntry(ctx, a, Entry{
			Action:          ActionEmptiedRecycleBin,
			Verb:            verbEmptiedRecycleBin,
			RecordType:      emptiedBinType,
			RecordTypeLabel: emptiedBinLabel,
			RecordName:      emptiedBinName,
			Details:         details,
			Items:           purged,
		})
		return err
	})
	if err != nil {
		return EmptyResult{}, err
	}
	return EmptyResult{Count: len(purged)}, nil
}
