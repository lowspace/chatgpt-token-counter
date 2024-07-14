async function loadTokenizer(model_slug) {
    let tokenizerModule;

    if (model_slug === 'gpt4o') {
        tokenizerModule = await import('@lenml/tokenizer-gpt4o');
    } else {
        tokenizerModule = await import('@lenml/tokenizer-gpt4');
    }

    const { fromPreTrained } = tokenizerModule;
    return fromPreTrained;
}

async function main() {
    const model_slug = 'gpt4'; // 或者其它值
    const fromPreTrained = await loadTokenizer(model_slug);

    const tokenizer = fromPreTrained();
    const context = "test context";
    const tokens = tokenizer.encode(context);
    const tokens_cnt = tokens.length;

    console.log(
        "encode()",
        tokens
    );
    console.log(
        "_encode_text",
        tokenizer._encode_text(context)
    );
    console.log(
        "_tokens_cnt",
        tokens_cnt
    );
}

main();
