package authz

import "context"

// Each builder of an access object answers nil for an internal call (a context without Grants).

type PlanContentAccess struct {
	AddCampaign      Availability `json:"addCampaign"`
	EditCampaigns    Availability `json:"editCampaigns"` // add initiatives, edit, move and copy campaigns and initiatives
	DeleteCampaigns  Availability `json:"deleteCampaigns"`
	AddActivity      Availability `json:"addActivity"`
	EditActivities   Availability `json:"editActivities"` // edit, move and copy activities; add, edit and duplicate line items
	DeleteActivities Availability `json:"deleteActivities"`
	SubmitActivities Availability `json:"submitActivities"`
}

type PlanAccess struct {
	Edit       Availability      `json:"edit"`
	EditBudget Availability      `json:"editBudget"` // also not available for an allocated plan (global budgets)
	Delete     Availability      `json:"delete"`
	Publish    Availability      `json:"publish"`
	Copy       Availability      `json:"copy"`
	Export     Availability      `json:"export"`
	Content    PlanContentAccess `json:"content"`
}

type ContainerAccess struct {
	Edit     Availability `json:"edit"`
	Delete   Availability `json:"delete"`
	Move     Availability `json:"move"`
	Copy     Availability `json:"copy"`
	AddChild Availability `json:"addChild"`
}

type ActivityAccess struct {
	Edit            Availability `json:"edit"`
	Delete          Availability `json:"delete"`
	Move            Availability `json:"move"`
	Copy            Availability `json:"copy"`
	AddLineItem     Availability `json:"addLineItem"`
	EditLineItems   Availability `json:"editLineItems"`
	DeleteLineItems Availability `json:"deleteLineItems"`
	Submit          Availability `json:"submit"` // the permission only; 008's actions add the activity's own state
	SeeFinance      Availability `json:"seeFinance"`
}

type LineItemAccess struct {
	Add        Availability `json:"add"`
	Edit       Availability `json:"edit"`
	Delete     Availability `json:"delete"`
	Duplicate  Availability `json:"duplicate"`
	SeeFinance Availability `json:"seeFinance"`
	SendSwbs   Availability `json:"sendSwbs"`
}

type BinEntryAccess struct {
	Restore           Availability `json:"restore"` // also Undo and the restore preview
	DeletePermanently Availability `json:"deletePermanently"`
}

func ContentAccessOf(ctx context.Context, plan PlanFacts) *PlanContentAccess {
	if _, restricted := From(ctx); !restricted {
		return nil
	}
	content := contentAccess(ctx, plan)
	return &content
}

func contentAccess(ctx context.Context, plan PlanFacts) PlanContentAccess {
	return PlanContentAccess{
		AddCampaign:      Available(ctx, CampaignsEdit, plan),
		EditCampaigns:    Available(ctx, CampaignsEdit, plan),
		DeleteCampaigns:  Available(ctx, CampaignsDelete, plan),
		AddActivity:      Available(ctx, ActivitiesEdit, plan),
		EditActivities:   Available(ctx, ActivitiesEdit, plan),
		DeleteActivities: Available(ctx, ActivitiesDelete, plan),
		SubmitActivities: Available(ctx, ActivitiesSubmit, plan),
	}
}

// PlanAccessOf: copying needs "Create and copy plans" for the plan's teams, as the copy keeps them.
func PlanAccessOf(ctx context.Context, plan PlanFacts) *PlanAccess {
	g, restricted := From(ctx)
	if !restricted {
		return nil
	}
	copyFacts := PlanFacts{ID: plan.ID, TeamIDs: plan.TeamIDs, OwnerID: plan.OwnerID, CreatedByID: g.PersonID}
	edit := Available(ctx, PlansEdit, plan)
	return &PlanAccess{
		Edit:       edit,
		EditBudget: edit,
		Delete:     Available(ctx, PlansDelete, plan),
		Publish:    Available(ctx, PlansPublish, plan),
		Copy:       Available(ctx, PlansCreate, copyFacts),
		Export:     Available(ctx, DataExport, plan),
		Content:    contentAccess(ctx, plan),
	}
}

func CampaignAccessOf(ctx context.Context, plan PlanFacts) *ContainerAccess {
	return containerAccess(ctx, plan, CampaignsEdit)
}

func InitiativeAccessOf(ctx context.Context, plan PlanFacts) *ContainerAccess {
	return containerAccess(ctx, plan, ActivitiesEdit)
}

func containerAccess(ctx context.Context, plan PlanFacts, addChild Permission) *ContainerAccess {
	if _, restricted := From(ctx); !restricted {
		return nil
	}
	edit := Available(ctx, CampaignsEdit, plan)
	return &ContainerAccess{
		Edit: edit, Delete: Available(ctx, CampaignsDelete, plan), Move: edit, Copy: edit,
		AddChild: Available(ctx, addChild, plan),
	}
}

func ActivityAccessOf(ctx context.Context, plan PlanFacts) *ActivityAccess {
	if _, restricted := From(ctx); !restricted {
		return nil
	}
	edit, remove := Available(ctx, ActivitiesEdit, plan), Available(ctx, ActivitiesDelete, plan)
	return &ActivityAccess{
		Edit: edit, Delete: remove, Move: edit, Copy: edit, AddLineItem: edit, EditLineItems: edit, DeleteLineItems: remove,
		Submit: Available(ctx, ActivitiesSubmit, plan), SeeFinance: Available(ctx, FinanceView, plan),
	}
}

func LineItemAccessOf(ctx context.Context, plan PlanFacts) *LineItemAccess {
	if _, restricted := From(ctx); !restricted {
		return nil
	}
	edit := Available(ctx, ActivitiesEdit, plan)
	return &LineItemAccess{
		Add: edit, Edit: edit, Delete: Available(ctx, ActivitiesDelete, plan), Duplicate: edit,
		SeeFinance: Available(ctx, FinanceView, plan), SendSwbs: Available(ctx, FinanceImport, plan),
	}
}
