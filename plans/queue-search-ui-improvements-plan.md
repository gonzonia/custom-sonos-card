- bring back the x icon right of eyecheck. This will only clear the search field if clicked. It should not show if nothing is entered in search field.

- eyecheck should not be visible if search text is empty

- there should never be a horisontal scroll in queue. If track title+artist is too long, use ellipsis

- queue.ts should be as little logic as possible, move logic to media-control-service (this already has playMedia, reuse that)
- queue icon should be part of media-row, and should not show if checkbox is shown
- delete mode should be select mode instead, change icon to playlist-edit
-- in this mode, if any items selected give the queue option in top bar. Clicking this will enqueue all selected items after the currently selected one. Special case: if currently playing track is selected, ignore that one.
