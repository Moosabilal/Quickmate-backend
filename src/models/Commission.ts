import { Schema, HydratedDocument, InferSchemaType, Types, model } from 'mongoose';

const CommissionRuleSchema = new Schema({
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: false,
        unique: true,
        sparse: true,
    },
    flatFee: {
        type: Number,
        required: false,
        min: 0,
    },
    categoryCommission: {
        type: Number,
        required: false,
        min: 0,
        max: 100,
    },
    status: {
        type: Boolean,
        default: true, 
    },
}, {
  timestamps: true,
});

type CommissionRuleSchemaType = InferSchemaType<typeof CommissionRuleSchema>;
export interface ICommissionRule extends HydratedDocument<CommissionRuleSchemaType> {} 

export const CommissionRule = model<ICommissionRule>('CommissionRule', CommissionRuleSchema);