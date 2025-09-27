const snowflake = require('snowflake-sdk');

const connectionConfig = {
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE
};

const connectToSnowflake = () => {
  return snowflake.createConnection(connectionConfig);
};

module.exports = { connectToSnowflake };