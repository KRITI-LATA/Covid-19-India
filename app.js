const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
module.exports = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDatabaseObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//Returns a list of all states in the state table

app.get("/states/", async (request, response) => {
  const covidStateQuery = `select * from state;`;
  const dbResponse = await db.all(covidStateQuery);
  response.send(
    dbResponse.map((eachArray) =>
      convertDatabaseObjectToResponseObject(eachArray)
    )
  );
});

//Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateDetailQuery = `select * from state 
    where state_id = ${stateId};`;
  const dbResponse = await db.get(stateDetailQuery);
  response.send(convertDatabaseObjectToResponseObject(dbResponse));
});

//Create a district in the district table, district_id is auto-incremented

app.post("/districts/", async (request, response) => {
  const casesDetail = request.body;
  const { districtName, cases, cured, active, deaths } = casesDetail;
  const casesDetailQuery = `insert into district (district_name, 
        cases, cured, active, deaths) values ('${districtName}', 
        '${cases}', '${cured}', '${active}', '${deaths}');`;
  const dbResponse = await db.run(casesDetailQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtParticularQuery = `select * from district where 
    district_id = ${districtId};`;
  const dbResponse = await db.get(districtParticularQuery);
  response.send(convertDatabaseObjectToResponseObject(dbResponse));
});

//Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `delete from district where 
    district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const covidDistrict = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = covidDistrict;
  const covidDistrictQuery = `update district set
   district_name = '${districtName}',
   state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
     where district_id = ${districtId};`;
  await db.run(covidDistrictQuery);
  response.send("District Details Updated");
});

/* Returns the statistics of total cases, cured, active,
deaths of a specific state based on state ID */

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesStatsQuery = `select 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths) from district where state_id = ${stateId};`;
  const stats = await db.get(getStatesStatsQuery);

  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

/* Returns an object containing the state name of a district 
based on the district ID */

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `select state_id from 
    district where district_id = ${districtId};`;
  const getDistictQueryResponse = await db.get(getDistrictIdQuery);
  const getStateNameQuery = `select state_name as stateName from
    state where state_id = ${getDistictQueryResponse.state_id};`;
  const getStateNameQueryResponse = await db.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});
