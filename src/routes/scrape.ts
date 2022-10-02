import { Router } from "express";

import { scraper } from "../scraper/main";
import { pool } from "../db/connection";

const router = Router();

router.get("/", async (_req, res) => {
    const data = await pool.query("SELECT * FROM articles");
    if (data.rows.length > 0) {
        return res.json(data.rows);
    }
    const scrapedData = await scraper("https://blog.logrocket.com");
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        for (const article of scrapedData) {
            const { title, description, link } = article;
            await client.query(
                "INSERT INTO articles (title, description, link) VALUES ($1, $2, $3)",
                [title, description, link]
            );
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        return res.status(500).send(error);
    } finally {
        client.release();
    }
    return res.json(scrapedData);
});

export default router;
