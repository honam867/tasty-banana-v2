# Help me to design this database instead of using current prompt templates logic

**For next feature, i don't want to use prompt template have implmemented, but just keep it we will use it later**
_Start with text to image feature before going to another_

- Design database for me i want, i will explain what, where, and why we need this:

## prompt_templates schema:

- What: with those fields: `name`, `previewUrl`, `prompt`
- Where to use: for `style library` and `hint` to populate, this maybe a `prompTemplateId` ( optional ) send from payload and replace constant `PromptTemplates.textToImage(sanitizedPrompt);` at file `src\services\queue\processors\imageGeneration.processor.js`,
  to `getPromptemplateById`, and check if it have `prompTemplateId`, will handle logic add this promptemlate behind on base prompt
- Why: Use for user they want to enhance their prompt

-> Example:
name: "Colorful dream"
prompt: "with colorful dream tone .... "

## Style library schema: name, promptTemplateIds

- What: with those fields: `name`, `promptTemplateIds`.
- Where to use: To list prompt template on UI, user will select on it
- Why: Easy to management and extend

- Example:
  ---- name : "Fun", "Realistic'

## Hint schema: name, type , promptTemplateIds

- What: with those fields: `name`, `promptTemplateIds`, `operate`, 1 hint have many promptemplates
- Where to use: To list prompt template on UI, user will select on it, this will useful for user don't have any idea to gerated their image
- Why: Easy to management and extend

-> After you add those schema, let me run db command, also i want you implement for me  routes for each schema for me to managemenet CRUD base on above schema
