export const ERROR_TRANSACTION_FAILED = 'ERROR_TRANSACTION_FAILED';

export class TransactionError extends Error {
    constructor(private errors) {
        super(ERROR_TRANSACTION_FAILED/*, 500*/);
    }
}