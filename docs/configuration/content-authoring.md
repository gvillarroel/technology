# Remote Content Authoring Guide

The private `site.json` object is the governed source of truth. Content is not authored or cached in this
repository.

## Add a Record

Update the appropriate object under `datasets`, preserve `schemaVersion: 1`, review the JSON outside the
code repository, and replace the exact GCS object through the data owner's controlled publishing process.
Run a site build against the candidate object before promotion by setting `TECHNOLOGY_SITE_CATALOG_URI`.

## Add a Generic Route

Add the dataset, then add a route with `template: "catalog"` and a field projection:

```json
{
  "id": "communities",
  "path": "/communities/",
  "label": "Communities",
  "group": "practice",
  "navigation": true,
  "template": "catalog",
  "dataset": "tech-communities",
  "catalog": {
    "collection": "communities",
    "titleField": "name",
    "summaryField": "summary",
    "tagsField": "tags",
    "linkField": "link"
  }
}
```

The shared catch-all routes generate both `/communities/` and `/communities.md`. No page file is needed.

## When Code Is Needed

Change code only for a new transport, new normalization rule, or new interaction model. Add transports in
`connectors.ts`; add domain shaping in a domain loader; add a reusable template when the generic catalog
projection is insufficient.

Do not put secrets in the catalog. Generated pages are public.
