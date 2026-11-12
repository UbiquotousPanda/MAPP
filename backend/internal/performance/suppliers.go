package performance

import (
	"context"
	"fmt"

	"mapp/internal/platform/errs"
)

func (s *Service) checkReactivation(ctx context.Context, sourceID string, status Status) error {
	if status != StatusActive {
		return nil
	}
	mappings, err := s.repo.ListMappings(ctx, []string{sourceID})
	if err != nil {
		return err
	}
	for _, m := range mappings {
		if err = s.checkSupplies(ctx, m); err != nil {
			return err
		}
	}
	return nil
}

// CheckSupplier refuses a second active source for a model's stage or revenue; it spans two tables (ADR-0021).
func (s *Service) CheckSupplier(ctx context.Context, modelID string, meaning Meaning, stage string) error {
	return s.checkSupplies(ctx, Mapping{ModelID: modelID, Meaning: meaning, Stage: stage})
}

// checkSupplies is the one check of create, edit, reactivate and restore; a mapping never clashes with itself.
func (s *Service) checkSupplies(ctx context.Context, m Mapping) error {
	if m.ModelID == "" || !suppliesModel(m.Meaning) {
		return nil
	}
	suppliers, err := s.repo.ActiveSuppliers(ctx, m.ModelID)
	if err != nil {
		return err
	}
	for _, supplier := range suppliers {
		if err = clash(m, supplier); err != nil {
			return err
		}
	}
	return nil
}

func clash(m Mapping, supplier Supplier) error {
	switch {
	case supplier.Meaning != m.Meaning || (m.ID != "" && supplier.MappingID == m.ID):
		return nil
	case m.Meaning == MeaningRevenue:
		return errs.NotAllowed(fmt.Sprintf(msgRevenueSupplied, supplier.SourceName))
	case supplier.Stage == m.Stage:
		return errs.NotAllowed(fmt.Sprintf(msgStageSupplied, supplier.SourceName, m.Stage))
	}
	return nil
}

func (s *Service) checkMappingSupplies(ctx context.Context, m Mapping) error {
	sources, err := s.repo.ListSources(ctx, m.SourceID)
	if err != nil || len(sources) == 0 || sources[0].Status == StatusInactive {
		return err
	}
	return s.checkSupplies(ctx, m)
}
