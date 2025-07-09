Rename the `.env.example` file to `.env`
Fill in all the token details within the `.env` file with correct values

OCR key is free tier from OCR Space

### What the bot does
>When a user uses the command, the user is prompted to upload a game winning or losing image from the game mode Honor Duel which will then be processed and ran through the 2 Tensorflow models to predict the Characters and Equipment. The OCR will grab the Wins, HP, Duel Points and Artifact.
>All data will then be collected and stored in the bots internal local SQLite file along with the original image compressed and stored in base64.


#### Commands
> The bot contains one command which is /submit-win

