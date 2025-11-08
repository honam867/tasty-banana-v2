# I want implement show image generations on the third panel

- Don't show any card on this component, i don't want to use card
- So the flow on the client will be:
- When user click field prompt, then click generate, it will show those image generation on this pannel
- You can check the status, of the api get generations, have a status, it have already description "Returns queue items (pending/processing), completed generations with images, and optionally failed items. Uses cursor-based pagination for infinite scroll."
- api at `/generations/my-generations`
- My expect, this api will show user to know in realtime for they know their result has done
- Example, when click outside or go to another page, they will receive notification (i don't know this logic have implemented or not on server)
- For the case they still on this page, they will see their result show realtime throught socket event, not fetch againt every second to update that list
- They will see that list with realtime status
  Here is the example of data:

```json
{
  "success": true,
  "status": 200,
  "message": "User generations retrieved successfully",
  "data": {
    "results": [
      {
        "generationId": "6d5a0d77-933b-4373-a6f8-a2a329b4b49b",
        "status": "completed",
        "progress": 100,
        "createdAt": "2025-11-01T07:37:10.484Z",
        "metadata": {
          "prompt": "Professional portrait in a modern office",
          "numberOfImages": 1,
          "aspectRatio": "1:1",
          "projectId": ""
        },
        "tokensUsed": 20,
        "completedAt": "2025-11-01T07:37:12.451Z",
        "processingTimeMs": 9222,
        "images": [
          {
            "imageId": "8bde2d3a-6580-4559-ae00-f279c81acfcf",
            "imageUrl": "https://pub-8a7e41cbdc4e4287ae3a313bdea397cc.r2.dev/g/29d8c3ce-2c32-40ad-8770-6d0b51a2b563/gen-6d5a0d77-933b-4373-a6f8-a2a329b4b49b-1-1761982631965.png",
            "mimeType": "image/png",
            "sizeBytes": 2150276
          }
        ]
      }
    ],
    "cursor": {
      "next": "eyJjcmVhdGVkQXQiOiIyMDI1LTEwLTI4VDE1OjQ1OjUxLjk0M1oiLCJpZCI6ImY2ZDc5MmQ1LTUxN2EtNDc3NS04ZWIyLWE5OGE1NTkyZGQ1ZiJ9",
      "hasMore": true
    }
  }
}
```

- As the image i have mention to implement on ui , you can see have a image on the right, really small, show the first array ( like a preview ) in the images
- When click it will scroll active into each generation (1 section will be 1 generation) (1 generation have multiple image)
- When click into the image, it will show image gallry and can be click next into image in 1 generation (consider to install library, research to set up)
- Also i want the token show on the sidebar will realtime got their token update after the image generation
  **Please implement this logic on UI with best practice, highly reuse**
  Also if any part in this logic have not implemented on `server`, please consider to implement it too
