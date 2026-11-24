// Framework cache directives require the Next compiler/request runtime. They are
// intentionally inert in Node integration tests; invalidation is covered by E2E.
export function cacheLife() {}
export function cacheTag() {}
export function updateTag() {}
export function revalidatePath() {}
export function revalidateTag() {}
