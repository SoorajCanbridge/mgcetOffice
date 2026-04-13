/**
 * Student category & tag — backend reference
 * Implement these routes and extend the Student model so the Next app can manage taxonomy and assign values on create/update.
 *
 * Expected API base: same host as other resources (e.g. /student-categories, /student-tags).
 *
 * --- StudentCategory ---
 * GET    /student-categories?collegeId=&isActive=   — list (college scoped; collegeId optional if derived from JWT)
 * GET    /student-categories/:id                    — single category (for detail page)
 * POST   /student-categories                        — body: { name, description?, isActive?, college }
 * PUT    /student-categories/:id                     — same body
 * DELETE /student-categories/:id
 *
 * --- StudentTag ---
 * GET    /student-tags?collegeId=&isActive=
 * POST   /student-tags                               — body: { name, description?, color?, isActive?, college }
 * PUT    /student-tags/:id                             — color: optional hex string e.g. #6366f1
 * DELETE /student-tags/:id
 *
 * --- Student create/update (existing /students) ---
 * Accept optional fields on POST /students and PUT /students/:id:
 *   category: ObjectId | null   — single reference; null clears
 *   tags: ObjectId[]            — array replaces full set (empty array clears all tags)
 *
 * Partial PUT (e.g. only category) should merge into the existing student document, same as PATCH-style
 * updates used elsewhere (e.g. image-only PUT). Category detail UI sends:
 *   PUT /students/:id  { category: null }           — remove from category
 *   PUT /students/:id  { category: <otherId> }      — transfer to another category
 *
 * Populate `category` and `tags` on GET /students and GET /students/:id so the UI can show names.
 *
 * List students by category (detail page):
 *   GET /students?categoryId=<id>&limit=1000
 * If this query param is omitted on the backend, the UI still filters client-side using each student’s `category` field.
 *
 * List students by tag (tags page):
 *   GET /students?tagId=<id>&limit=1000
 * Optional; tags page also filters client-side using each student’s `tags` array.
 */
