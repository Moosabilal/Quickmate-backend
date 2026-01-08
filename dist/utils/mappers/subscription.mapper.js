export const toAdminSubscriptionPlanList = async (plans) => {
    return plans.map((plan) => ({
        ...plan.toObject(),
        id: plan._id.toString(),
    }));
};
