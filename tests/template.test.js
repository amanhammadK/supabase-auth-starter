import { SupabaseAuthStarterServer } from "../src/mcpServer.js";

describe("SupabaseAuthStarterServer", () => {
    let server;

    beforeEach(() => {
        server = new SupabaseAuthStarterServer();
    });

    test("should initialize server", () => {
        expect(server).toBeDefined();
        expect(server.server).toBeDefined();
    });
});
