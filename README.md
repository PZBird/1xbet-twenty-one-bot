This is bot checks 1xbet twenty one game and send it to the telegram channel.
After start it sends to channel real time games statistics. (see image)
![telegram 1xbet twenty one](https://raw.githubusercontent.com/PZBird/1xbet-twenty-one-bot/master/channel.jpg)

## To run bot:
1. Create .env file
2. Set TELEGRAM_TOKEN and TELEGRAM_CHANNEL in it
3. Start bot:
  * With docker
    ```
    docker build -t 1xbet .
    docker run --name 1xbet -d 1xbet
    ```
  * Without docker
    ```
    npm install
    npm start
    ```
       OR
    ```
    yarn install
    yarn start
    ```

