# Feature Image reference ( route + logic flow ) Start with 1 first

- Big picture now i have a feature that, user will upload their image ( or select image from previous their image generations (optional) )
  i want have a `promptGenerationSystem` (resuse function, maybe utils, this function will be replace on the future, input is parameters, then have a prompt base on that, example: `
"subject": "Focus only the subject ....") + base prompt` of the user
- We will have 2 type this image reference ( consider to add into schema if missing or suggest )

1. Single Reference feature (only upload 1 image) (why i have to do this? I want to optimize the result of the generation image):
   With _subject_ (type subject) focus on subject
   With _face_ (type face) focus on face
   With full_image (full image) scan for all the image
   The body of this feature route

- The body of this route not have `promptTemplateId`
