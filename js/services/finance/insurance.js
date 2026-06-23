/**
 * Modular Insurance Domain Service
 * Re-exports liability functions since insurance is modeled as a card category
 */

export { 
    addCreditCard as addInsurance,
    updateCreditCard as updateInsurance,
    deleteCreditCard as deleteInsurance,
    deleteCreditCardForMonth as deleteInsuranceForMonth
} from './liabilities.js';
