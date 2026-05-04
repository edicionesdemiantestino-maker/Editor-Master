import { test, expect } from "@playwright/test";

test("editor demo: agregar texto y exportar PNG", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/editor/demo");
  await expect(page.getByRole("button", { name: "+ Texto" })).toBeVisible({
    timeout: 90_000,
  });
  await page.getByRole("button", { name: "+ Texto" }).click();
  await page.getByRole("button", { name: "Exportar" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename().toLowerCase()).toMatch(/\.png$/i);
});
