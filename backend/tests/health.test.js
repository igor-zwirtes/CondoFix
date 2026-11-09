const request = require("supertest");
const app = require("../src/app");

describe("GET /api/health", () => {

  it("deve retornar 200 quando a API e o banco estiverem funcionando", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ok",
        database: "connected",
      },
    });
  });
});
