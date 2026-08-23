# Globe asset provenance

## `earth-night.jpg`

Night-lights composite of Earth, used as the surface texture for the 3D conflict
tracker in `src/components/GlobeCard.tsx`.

- **Source imagery:** NASA Earth Observatory — "Black Marble" / Visible Earth
  night-lights composite.
- **Obtained from:** the `three-globe` project's example assets
  (`three-globe/example/img/earth-night.jpg`), which redistributes the NASA
  composite. `three-globe` is MIT licensed.
- **Licence:** NASA imagery is not subject to copyright protection in the United
  States and is free to use. See NASA's media usage guidelines:
  <https://www.nasa.gov/nasa-brand-center/images-and-media/>
- **Why it is vendored:** the component previously fetched this file from
  `unpkg.com` on every launch. That broke the offline-first guarantee and put a
  third-party CDN in the startup path of an application that is otherwise
  network-restricted by policy. Bundling it removes that dependency.

No modifications have been made to the image.
