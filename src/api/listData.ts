// import * as stripe from "stripe";
//
// export type Expander<T extends {id: string, created: number}> = (accountId: string, objectId: string, paramName: string) => T;
//
// export function listData<T extends {id: string, created: number}>(data: T[], params: stripe.IListOptions, getter: Expander<T>, expanders: {[member: string]: Expander<any>}): stripe.IList<T> {
//     if (params.starting_after) {
//         const startingAfterIx = data.findIndex(d => d.id === params.starting_after);
//         if (startingAfterIx === -1) {
//
//         }
//         data = data.splice(0, startingAfterIx + 1);
//     } else if (params.ending_before) {
//         const endingBeforeIx = data.findIndex(d => d.id === params.ending_before);
//         if (endingBeforeIx !== -1) {
//             data = data.splice(endingBeforeIx, data.length - endingBeforeIx + 1);
//         }
//     }
// }
