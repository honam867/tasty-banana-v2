# help me to implement this layout in studio @agents\client\layout.png (remember that it have responsive), try to do bellow with best practice

- This studio page will seperate in to 3 parts
- With the sidebar , only have 2 items ( at center vertical ) is Image and History
- When go to this `/studio` will auto active first item is Image
- History is Building, empty component
- At the bottom of the sidebar just simply show avatar and the token (coin icon), at this component need to fetch api `/tokens/balance` (you can check the route for know the result response at file @server\src\routes\tokens.route.js)
- For col 2, it show 3 tabs, when click those tab it will go to `/studio/text-to-image` (same with another items), also active first tab
- just that, after implemented this we will go to the next logic to connect text-to-image api later
- And the third col in layout image just show currently building
