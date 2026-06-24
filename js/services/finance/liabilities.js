/**
 * Modular Liabilities Domain Service
 */

import { database } from '../../firebase-config.js';
import { 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    push 
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { 
    getAuthenticatedUser,
    getSectionDbPath,
    findCardRefAndData,
    normalizeMonthKey
} from './helpers.js';

/**
 * Add a credit card (with month-specific outstanding)
 */
export async function addCreditCard(cardData, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const type = cardData.type || 'credit-card';
        const cardsRef = ref(database, getSectionDbPath(type, user.uid));
        const newRef = push(cardsRef);
        
        const balanceVal = cardData.balance !== undefined ? cardData.balance : cardData.outstandingBalance;
        const parsedBalance = parseFloat(balanceVal) || 0;

        const baseData = {
            type,
            name: cardData.name || '',
            issuer: cardData.issuer || '',
            color: cardData.color || '#ff6b6b',
            notes: cardData.notes || '',
            createdAt: Date.now(),
            createdMonth: month || new Date().toISOString().slice(0, 7),
            updatedAt: Date.now(),
            balances: {},
            paymentStatusByMonth: {},
            outstandingBalance: parsedBalance
        };

        const isInsurance = type === 'insurance';

        if (!isInsurance) {
            baseData.dueDate = cardData.dueDate || '';
            baseData.expenseDate = cardData.expenseDate || '';
            
            // Check for loan-specific fields
            if (type === 'loan') {
                baseData.loanStartMonth = cardData.loanStartMonth || '';
                baseData.tenure = parseInt(cardData.tenure) || 0;
                baseData.interestRate = parseFloat(cardData.interestRate) || 0;
                baseData.loanType = cardData.loanType || 'credit-card-emi';
                baseData.processingFee = parseFloat(cardData.processingFee) || 0;
                baseData.totalLoanAmount = parseFloat(cardData.totalLoanAmount) || 0;
            } else {
                baseData.creditLimit = parseFloat(cardData.creditLimit) || 0;
            }
        } else {
            baseData.premiumTerm = cardData.premiumTerm || 'yearly';
            baseData.dueDate = cardData.dueDate || '';
            baseData.insuranceCategory = cardData.insuranceCategory || '';
            baseData.policyNumber = cardData.policyNumber || '';
            baseData.insuranceStartDate = cardData.insuranceStartDate || '';
            baseData.insuranceValidUpto = cardData.insuranceValidUpto || '';
            baseData.coverageAmount = parseFloat(cardData.coverageAmount) || 0;
            baseData.insuranceStatus = cardData.insuranceStatus || '';
        }

        if (month) {
            baseData.balances[month] = parsedBalance;
            baseData.paymentStatusByMonth[month] = cardData.isPaid || false;
            if (isInsurance) {
                baseData.insuranceByMonth = {
                    [month]: {
                        insuranceCategory: cardData.insuranceCategory || '',
                        policyNumber: cardData.policyNumber || '',
                        insuranceStartDate: cardData.insuranceStartDate || '',
                        insuranceValidUpto: cardData.insuranceValidUpto || '',
                        coverageAmount: parseFloat(cardData.coverageAmount) || 0,
                        insuranceStatus: cardData.insuranceStatus || '',
                        notes: cardData.notes || '',
                        issuer: cardData.issuer || ''
                    }
                };
            }
        }

        await set(newRef, baseData);
        return { success: true, id: newRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a credit card
 */
export async function updateCreditCard(cardId, updates, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const record = await findCardRefAndData(user.uid, cardId);
        if (!record) {
            return { success: false, error: 'Card or loan record not found' };
        }

        const { ref: cardRef, card } = record;
        const isInsuranceUpdate = card.type === 'insurance';

        const updateData = { updatedAt: Date.now() };

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.issuer !== undefined) updateData.issuer = updates.issuer;
        if (updates.color !== undefined) updateData.color = updates.color;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.expenseDate !== undefined) updateData.expenseDate = updates.expenseDate;
        
        if (!isInsuranceUpdate) {
            if (updates.creditLimit !== undefined) updateData.creditLimit = parseFloat(updates.creditLimit) || 0;
            if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
        } else {
            if (updates.premiumTerm !== undefined) updateData.premiumTerm = updates.premiumTerm;
            if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
            if (updates.insuranceCategory !== undefined) updateData.insuranceCategory = updates.insuranceCategory;
            if (updates.policyNumber !== undefined) updateData.policyNumber = updates.policyNumber;
            if (updates.insuranceStartDate !== undefined) updateData.insuranceStartDate = updates.insuranceStartDate;
            if (updates.insuranceValidUpto !== undefined) updateData.insuranceValidUpto = updates.insuranceValidUpto;
            if (updates.coverageAmount !== undefined) updateData.coverageAmount = parseFloat(updates.coverageAmount) || 0;
            if (updates.insuranceStatus !== undefined) updateData.insuranceStatus = updates.insuranceStatus;
        }

        if (updates.loanStartMonth !== undefined && !isInsuranceUpdate) {
            updateData.loanStartMonth = updates.loanStartMonth;
        }
        if (updates.tenure !== undefined && !isInsuranceUpdate) {
            updateData.tenure = parseInt(updates.tenure) || 0;
        }
        if (updates.interestRate !== undefined && !isInsuranceUpdate) {
            updateData.interestRate = parseFloat(updates.interestRate) || 0;
        }
        if (updates.loanType !== undefined && !isInsuranceUpdate) {
            updateData.loanType = updates.loanType;
        }
        if (updates.processingFee !== undefined && !isInsuranceUpdate) {
            updateData.processingFee = parseFloat(updates.processingFee) || 0;
        }
        if (updates.totalLoanAmount !== undefined && !isInsuranceUpdate) {
            updateData.totalLoanAmount = parseFloat(updates.totalLoanAmount) || 0;
        }

        const balanceVal = updates.balance !== undefined ? updates.balance : updates.outstandingBalance;
        if (balanceVal !== undefined) {
            const parsedBalance = parseFloat(balanceVal) || 0;
            if (month) {
                updateData[`balances/${month}`] = parsedBalance;
            }
            updateData.outstandingBalance = parsedBalance;
        }
        if (updates.isPaid !== undefined && month) {
            updateData[`paymentStatusByMonth/${month}`] = Boolean(updates.isPaid);
        }

        if (isInsuranceUpdate && month) {
            if (updates.insuranceCategory !== undefined) updateData[`insuranceByMonth/${month}/insuranceCategory`] = updates.insuranceCategory;
            if (updates.policyNumber !== undefined) updateData[`insuranceByMonth/${month}/policyNumber`] = updates.policyNumber;
            if (updates.insuranceStartDate !== undefined) updateData[`insuranceByMonth/${month}/insuranceStartDate`] = updates.insuranceStartDate;
            if (updates.insuranceValidUpto !== undefined) updateData[`insuranceByMonth/${month}/insuranceValidUpto`] = updates.insuranceValidUpto;
            if (updates.coverageAmount !== undefined) updateData[`insuranceByMonth/${month}/coverageAmount`] = parseFloat(updates.coverageAmount) || 0;
            if (updates.insuranceStatus !== undefined) updateData[`insuranceByMonth/${month}/insuranceStatus`] = updates.insuranceStatus;
            if (updates.notes !== undefined) updateData[`insuranceByMonth/${month}/notes`] = updates.notes;
            if (updates.issuer !== undefined) updateData[`insuranceByMonth/${month}/issuer`] = updates.issuer;
        }

        await update(cardRef, updateData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete a credit card, loan, expense, or insurance record completely
 */
export async function deleteCreditCard(cardId) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const record = await findCardRefAndData(user.uid, cardId);
        if (!record) {
            return { success: false, error: 'Record not found' };
        }
        await remove(record.ref);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete only the selected month's balances/payments for credit card, loan, expense or insurance.
 * If no monthly balances remain, deletes the entire record.
 */
export async function deleteCreditCardForMonth(cardId, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!month) return { success: false, error: 'Month is required' };

    try {
        const record = await findCardRefAndData(user.uid, cardId);
        if (!record) {
            return { success: false, error: 'Record not found' };
        }

        const { ref: cardRef, card } = record;
        const balances = card.balances && typeof card.balances === 'object' ? card.balances : null;

        // Legacy record handling
        if (!balances) {
            const legacyMonth = card.createdMonth || null;
            if (legacyMonth && legacyMonth !== month) {
                return { success: true, removedMonth: false, deletedWholeRecord: false };
            }
            await remove(cardRef);
            return { success: true, removedMonth: true, deletedWholeRecord: true };
        }

        if (balances[month] === undefined) {
            return { success: true, removedMonth: false, deletedWholeRecord: false };
        }

        const remainingMonths = Object.keys(balances).filter((key) => key !== month && balances[key] !== undefined && balances[key] !== null);
        if (remainingMonths.length === 0) {
            await remove(cardRef);
            return { success: true, removedMonth: true, deletedWholeRecord: true };
        }

        const updates = {
            [`balances/${month}`]: null,
            [`paymentStatusByMonth/${month}`]: null,
            updatedAt: Date.now()
        };

        const legacyMonth = card.createdMonth || null;
        if (legacyMonth === month && remainingMonths.length > 0) {
            updates.createdMonth = remainingMonths.sort()[0];
        }

        await update(cardRef, updates);
        return { success: true, removedMonth: true, deletedWholeRecord: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Calculate amortization schedule for a loan
 */
export function calculateAmortizationSchedule(principal, annualRate, tenureMonths, processingFee = 0, loanType = 'credit-card-emi') {
    const monthlyRate = (annualRate / 12) / 100;
    const isCcEmi = loanType !== 'personal-loan';
    
    // EMI Formula: [P x R x (1+R)^N] / [((1+R)^N) - 1]
    let emi = 0;
    if (monthlyRate > 0 && tenureMonths > 0) {
        emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    } else {
        emi = tenureMonths > 0 ? (principal / tenureMonths) : 0;
    }
    
    const schedule = [];
    let remainingPrincipal = principal;
    
    for (let i = 1; i <= tenureMonths; i++) {
        const interest = remainingPrincipal * monthlyRate;
        const gst = isCcEmi ? (interest * 0.18) : 0;
        const principalPaid = Math.min(remainingPrincipal, emi - interest);
        const startBalance = remainingPrincipal;
        remainingPrincipal = Math.max(0, remainingPrincipal - principalPaid);
        
        let extraCharges = 0;
        if (i === 1) {
            extraCharges = isCcEmi 
                ? (processingFee + (processingFee * 0.18))
                : processingFee;
        }
        
        schedule.push({
            monthIndex: i,
            startBalance,
            emi,
            principalPaid,
            interestPaid: interest,
            gstOnInterest: gst,
            endBalance: remainingPrincipal,
            totalOutflow: emi + gst + extraCharges
        });
    }
    return schedule;
}
