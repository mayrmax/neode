export const ERROR_VALIDATION = 'ERROR_VALIDATION';

export class ValidationError extends Error {
    private details;
    private input;
    private _joiError;

    constructor(details, input, _joiError) {
        super(ERROR_VALIDATION/*, 422*/);

        this.details = details;
        this.input = input;
        this._joiError = _joiError;
    }
}