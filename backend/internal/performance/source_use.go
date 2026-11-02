package performance

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"mapp/internal/platform/errs"
)

// sourceInUse also counts the integration IDs of binned activities, which a restore would put back.
func (s *Service) sourceInUse(ctx context.Context, src Source) error {
	use, err := s.repo.SourceUse(ctx, src.ID)
	if err != nil {
		return err
	}
	binned, err := s.binnedIntegrationIDs(ctx, src.ID)
	if err != nil {
		return err
	}
	use.IntegrationIDs += binned
	switch {
	case use.Facts > 0:
		return errs.InUse(fmt.Sprintf(msgHoldsFacts, src.Name))
	case use.IsUsed():
		return errs.InUse(fmt.Sprintf(msgSourceInUse, src.Name, useText(use)))
	}
	return nil
}

func (s *Service) binnedIntegrationIDs(ctx context.Context, sourceID string) (int, error) {
	snapshots, err := s.history.SnapshotsInBin(ctx, integrationKind)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, snapshot := range snapshots {
		var key IntegrationID
		if err = json.Unmarshal(snapshot.Data, &key); err != nil {
			return 0, err
		}
		if key.SourceID == sourceID {
			count++
		}
	}
	return count, nil
}

func useText(use SourceUse) string {
	var parts []string
	for _, p := range []struct {
		count        int
		one, several string
	}{
		{use.Imports, "1 load", "%d loads"},
		{use.ReviewRows, "1 row to review", "%d rows to review"},
		{use.IntegrationIDs, "1 activity's integration ID", "%d activities' integration IDs"},
	} {
		switch {
		case p.count == 1:
			parts = append(parts, p.one)
		case p.count > 1:
			parts = append(parts, fmt.Sprintf(p.several, p.count))
		}
	}
	return strings.Join(parts, ", ")
}
