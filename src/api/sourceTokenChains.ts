export function isSourceTokenChain(sourceToken: string): boolean {
    return /^[a-zA-Z0-9_-]+(\|[a-zA-Z0-9_-]+)+$/.test(sourceToken);
}

interface SourceTokenChainState {
    sourceTokens: string[];
    nextSourceTokenIx: number;
}

const sourceTokenChainStates: {[sourceToken: string]: SourceTokenChainState} = {};

export function getEffectiveSourceTokenFromChain(sourceToken: string): string {
    let state: SourceTokenChainState = sourceTokenChainStates[sourceToken];
    if (!state) {
        state = sourceTokenChainStates[sourceToken] = {
            sourceTokens: sourceToken.split(/\|/),
            nextSourceTokenIx: 0
        };
    }

    if (state.nextSourceTokenIx >= state.sourceTokens.length) {
        throw new Error(`Source token chain '${sourceToken}' can only be used ${state.sourceTokens.length} times.`);
    }

    return state.sourceTokens[state.nextSourceTokenIx++];
}
