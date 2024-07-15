# chatgpt-token-counter

## Dependency

1. `@lenml/tokenizers`: https://github.com/lenML/tokenizers/tree/main
2. `@lenml/tokenizer-gpt4`: https://github.com/lenML/tokenizers/tree/main/packages/gpt4
3. `@lenml/tokenizer-gpt4o`: https://github.com/lenML/tokenizers/tree/main/packages/gpt4o
4. `turdown`: https://github.com/mixmark-io/turndown

## Known Issues

- [ ] Cannot convert HTML content to LaTex correctly. E.g: the raw text contains 731 tokens, while the converted text contains 923 tokens.
- [ ] Cannot convert the code fence correctly. E.g: the raw text is: ```python print('123')```, while the converted text is: python Copy Code `print('123)`.