# External reader annotation seam (local v1)

Text-layer, page, and drawing updates inside readers do not recalculate chat annotation overlays. Sidebar closure, session changes, and source replacement still update visibility.

Readers dispatch a synchronous CustomEvent named `dsh-sidenote:external-annotation:v1` on document. Its detail is `{action,capture?,sessionId?,id?,point?,reply}`; reply receives `{accepted,id?,items?}`. This is a same-document plugin capability, not a network API.

- `probe`: check availability.
- `add`: capture is `{id?,sessionId,text,note?,source:{label,address?,page?,anchor?:{exact,start,prefix,suffix}},point?:{x,y},edit?}`. The target session and source are independent. The native editor opens by default; `edit:false` supports an editor inside a guest page. An optional capture id provides deduplication within the target session, including storage reloads.
- `list`: return external active and sent annotations for exactly the requested sessionId.
- `edit`: reopen the store numeric id after checking its sessionId. Sent annotations open read-only.

Changes dispatch `dsh-sidenote:external-annotations-changed`. Source buttons dispatch `dsh-sidenote:reveal-external:v1` with `{sessionId,source,text}`. The reader handles navigation and validates addresses; sidenote does not open arbitrary addresses directly.

Capture ids identify one selection for its full lifetime. Retried edits after sending or deletion are acknowledged without recreating active annotations; a new selection needs a new id. The optional `remove` action accepts `{sessionId,id?,captureId?}` and is idempotent, including removal before the first add acknowledgement. Foreign-session mutations and edits/removal during a pending send are rejected. Readers show only active blue markers and remove projections after send; historical messages retain their snapshot. Persistence stays compatible with v1; externalSource and externalCaptureId are optional fields. An unmodified upstream build declines the seam and readers should fall back.

External inline and dock editors persist input as it changes, allowing recovery after reload or unmount. Explicit cancellation restores the original edit or deletes a newly created note. Session changes close old editors; pending submissions reject reopening, and sent snapshots cannot be edited in place. Storage remains localStorage in the same browser and origin; clearing site data or quota failure can prevent recovery.

Optional text context is persisted and passed through the reveal event. Readers must validate it before restoring a location; old captures remain compatible.
