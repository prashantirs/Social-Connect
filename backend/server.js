const app=require('./app');
const { connectDatabse } = require('./config/database');

connectDatabse();

app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${process.env.PORT}`)
  })