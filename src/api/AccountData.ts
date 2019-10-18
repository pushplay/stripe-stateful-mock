export class AccountData<T extends {id: string, created: number}> {

    private data: {[accountId: string]: {[id: string]: T}} = {};

    constructor() {}

    get(accountId: string, objectId: string): T {
        return (this.data[accountId] && this.data[accountId][objectId]) || null;
    }

    getAll(accountId: string): T[] {
        if (!this.data[accountId]) {
            return [];
        }
        return Object.keys(this.data[accountId])
            .map(key => this.data[accountId][key])
            .sort((a, b) => b.created - a.created);
    }

    contains(accountId: string, objectId: string): boolean {
        return !!this.get(accountId, objectId);
    }

    put(accountId: string, obj: T): void {
        if (!this.data[accountId]) {
            this.data[accountId] = {};
        }
        if (this.data[accountId][obj.id]) {
            throw new Error(`There is already an entry for [${accountId}][${obj.id}].  Refusing to overwrite it because the result will be confusing.`);
        }
        this.data[accountId][obj.id] = obj;
    }

    remove(accountId: string, objectId: string): void {
        if (this.data[accountId]) {
            delete this.data[accountId][objectId];
        }
    }
}
