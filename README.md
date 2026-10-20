# jsonapi-client-framework-ts

Json:API Client Framework provides an object-oriented approach to build your [Json:API](https://jsonapi.org/) clients.

TypeScript port of [jsonapi-client-framework](https://github.com/hostnfly/jsonapi-client-framework) (Python).

## Installing

Using npm:

```sh
npm install jsonapi-client-framework-ts
```

Using yarn:

```sh
yarn add jsonapi-client-framework-ts
```

Using pnpm:

```sh
pnpm add jsonapi-client-framework-ts
```

## Usage

```ts
import {
  JsonAPICollection,
  JsonAPIResourceSchema,
} from "jsonapi-client-framework-ts";
import { z } from "zod";

// Declare your schema
const Person = JsonAPIResourceSchema.extend({
  first_name: z.string(),
  last_name: z.string(),
  year_of_birth: z.number(),
});
type Person = z.infer<typeof Person>;

// Easy setup
class People extends JsonAPICollection<Person> {
  readonly endpoint = "/people";
  readonly schema = Person;
}

const people = new People("https://your_api.domain.com/v1");
```

## Features

### Get full results as a list

```ts
// GET https://your_api.domain.com/v1/people?page[number]=1
// GET https://your_api.domain.com/v1/people?page[number]=2
// ...
// GET https://your_api.domain.com/v1/people?page[number]=23
const peopleList = await people.list().all();
```

`.all()` loads every page into memory before returning. For large result sets, `.pages()` yields one page at a time instead, so you can stop early without fetching the rest:

```ts
for await (const page of people.list().pages()) {
  // process(page) — one page's worth of results at a time
  if (foundWhatIWasLookingFor(page)) break; // no further pages get fetched
}
```

### Get a single result's page

```ts
// GET https://your_api.domain.com/v1/people?page[number]=2
const [peoplePage, meta] = await people.list().paginated(2);

// GET https://your_api.domain.com/v1/people?page[number]=2&page[size]=30
const [peoplePageSized, sizedMeta] = await people.list().paginated(2, 30);
```

### Filter results

```ts
// GET https://your_api.domain.com/v1/people?filter[date_of_birth]=1984&page[number]=1
// ...
// GET https://your_api.domain.com/v1/people?filter[date_of_birth]=1984&page[number]=4
const filteredPeople = await people
  .list({ filters: { date_of_birth: 1984 } })
  .all();
```

### Sort results

```ts
// GET https://your_api.domain.com/v1/people?sort=first_name,last_name&page[number]=1
// ...
// GET https://your_api.domain.com/v1/people?sort=first_name,last_name&page[number]=23
const sortedPeople = await people
  .list({ sort: ["first_name", "last_name"] })
  .all();
```

### Related resources

```ts
import {
  JsonAPICollection,
  JsonAPIResourceIdentifier,
  JsonAPIResourceSchema,
} from "jsonapi-client-framework-ts";
import { z } from "zod";

const Movie = JsonAPIResourceSchema.extend({
  title: z.string(),
  year: z.number(),
  // By default, the JSON:API payload only contains the identifier (id and type)
  director: z.union([Person, JsonAPIResourceIdentifier]),
});
type Movie = z.infer<typeof Movie>;

class Movies extends JsonAPICollection<Movie> {
  readonly endpoint = "/movies";
  readonly schema = Movie;
}

const movies = new Movies("https://your_api.domain.com/v1");
// GET https://your_api.domain.com/v1/movies/178
const movie = await movies.resource("178").get();
movie.director.id; // => "7"

const moviesWithDirector = new Movies(
  "https://your_api.domain.com/v1",
  undefined,
  undefined,
  "director",
);
// GET https://your_api.domain.com/v1/movies/178?include=director
const movieWithDirector = await moviesWithDirector.resource("178").get();
if ("year_of_birth" in movieWithDirector.director) {
  movieWithDirector.director.year_of_birth; // => 1961
}

// GET https://your_api.domain.com/v1/movies?include=director&page[number]=1
// ...
// GET https://your_api.domain.com/v1/movies?include=director&page[number]=117
const moviesList = await moviesWithDirector.list().all();
```

### Get a single resource as an object

```ts
// GET https://your_api.domain.com/v1/people/49
const person = await people.resource("49").get();
```

### Update a resource

```ts
const Movie = JsonAPIResourceSchema.extend({
  title: z.string(),
  year: z.number(),
});
type Movie = z.infer<typeof Movie>;

class Movies extends JsonAPICollection<Movie> {
  readonly endpoint = "/movies";
  readonly schema = Movie;
}

const movies = new Movies("https://your_api.domain.com/v1");

// PATCH https://your_api.domain.com/v1/movies/179
const updatedMovie = await movies.resource("179").update({ year: 1993 });
```

Object attributes are sent as is:

```ts
// Request body: { "data": { "attributes": { "title": { "en": "Jurassic Park", "fr": "" } } } }
await movies.resource("179").update({ title: { en: "Jurassic Park", fr: "" } });
```

With plain attributes (without a model, see below), an object with an `id` key is read as a relationship instead, so don't use that key in an object attribute.

### Write related resources

Pass a model instance to `create()` or `update()` to write related resources. Declare one class per resource type, extending `JsonAPIModel` with a static `type`, and create instances with `build()`. A field holding model instances is a relationship; `included` lists the relationships whose resources are sent in full, with dotted paths for nested ones.

```ts
import { JsonAPIModel } from "jsonapi-client-framework-ts";

class Person extends JsonAPIModel {
  static readonly type = "person";
  declare name?: string;
}

class Character extends JsonAPIModel {
  static readonly type = "character";
  declare name?: string;
  declare actor?: Person;
}

class MovieModel extends JsonAPIModel {
  static readonly type = "movie";
  declare year?: number;
  declare director?: Person | null;
  declare characters?: Character[];
}

// PATCH https://your_api.domain.com/v1/movies/179
await movies.resource("179").update(
  MovieModel.build({
    year: 1993,
    director: Person.build({ id: "5" }),
    characters: [
      Character.build({
        name: "Alan Grant",
        actor: Person.build({ name: "Sam Neill" }),
      }),
      Character.build({ id: "7", name: "Ellie Sattler" }),
    ],
  }),
  { included: ["characters.actor"] },
);
// Request body:
// {
//   "data": {
//     "type": "movie",
//     "id": "179",
//     "attributes": { "year": 1993 },
//     "relationships": {
//       "director": { "data": { "type": "person", "id": "5" } },
//       "characters": {
//         "data": [{ "type": "character", "lid": "1" }, { "type": "character", "id": "7" }]
//       }
//     }
//   },
//   "included": [
//     { "type": "person", "lid": "2", "attributes": { "name": "Sam Neill" } },
//     {
//       "type": "character",
//       "lid": "1",
//       "attributes": { "name": "Alan Grant" },
//       "relationships": { "actor": { "data": { "type": "person", "lid": "2" } } }
//     },
//     { "type": "character", "id": "7", "attributes": { "name": "Ellie Sattler" } }
//   ]
// }
```

- The model `type` is sent as `data.type`, and the resource id as `data.id` on `update()` (the id of the endpoint, over the model's `id`), as [JSON:API requires](https://jsonapi.org/format/#crud-updating).
- A field holding a model instance, or a list of them, is a [relationship](https://jsonapi.org/format/#document-resource-object-relationships); any other field is an attribute, even an object with an `id` key. An `undefined` field is not sent, a `null` field is sent.
- A relationship listed in `included` sends each related resource in full in the top-level `included` member (`attributes` is `{}` when empty). A related resource with an `id` is paired by it; a new one gets a generated [`lid`](https://jsonapi.org/format/#document-resource-object-identification). Each resource is sent once per `type` and `id`.
- A relationship not listed in `included` sends identifiers only, so every related resource needs an `id`.
- A relationship you leave out is not sent: the server keeps it as is.
- Declare fields with `declare`, and create instances with `build()` rather than a constructor: a class field without `declare` would reset the value set by a base class constructor.
- The `id` and `type` fields of a related resource are never sent as attributes: JSON:API [forbids fields named `id` or `type`](https://jsonapi.org/format/#document-resource-object-fields).
- A top-level `included` in a request is not defined by the base JSON:API specification: it only works with a server that accepts it. Don't confuse it with the `include` option, which is a query parameter asking the server to return related resources in the response.

## Advanced features

### Authentication

`JsonAPIAuth` is a minimal interface — implement it however your API expects credentials to be sent:

```ts
import type { JsonAPIAuth } from "jsonapi-client-framework-ts";

class BasicAuth implements JsonAPIAuth {
  constructor(
    private readonly username: string,
    private readonly password: string,
  ) {}

  headers(): Record<string, string> {
    const token = btoa(`${this.username}:${this.password}`);
    return { Authorization: `Basic ${token}` };
  }
}

const authenticatedPeople = new People(
  "https://your_api.domain.com/v1",
  new BasicAuth("user", "pass"),
);
```

### Sub-collections

```ts
import {
  JsonAPICollection,
  JsonAPIResourceSchema,
} from "jsonapi-client-framework-ts";
import { z } from "zod";

const Movie = JsonAPIResourceSchema.extend({ title: z.string() });
type Movie = z.infer<typeof Movie>;

const Theater = JsonAPIResourceSchema.extend({ name: z.string() });
type Theater = z.infer<typeof Theater>;

class Theaters extends JsonAPICollection<Theater> {
  readonly endpoint = "/theaters";
  readonly schema = Theater;
}

class Movies extends JsonAPICollection<Movie> {
  readonly endpoint = "/movies";
  readonly schema = Movie;

  theaters(): Theaters {
    return new Theaters(`${this.baseUrl}${this.endpoint}`, this.auth);
  }
}

const movies = new Movies("https://your_api.domain.com/v1");

// GET https://your_api.domain.com/v1/movies/theaters?page[number]=1
// ...
// GET https://your_api.domain.com/v1/movies/theaters?page[number]=6
const theatersList = await movies.theaters().list().all();
```

### Sub-resources

```ts
import {
  JsonAPIClient,
  JsonAPICollection,
  JsonAPIResource,
  JsonAPIResourceSchema,
} from "jsonapi-client-framework-ts";
import { z } from "zod";

const Character = JsonAPIResourceSchema.extend({ name: z.string() });
type Character = z.infer<typeof Character>;

class Characters extends JsonAPICollection<Character> {
  readonly endpoint = "/characters";
  readonly schema = Character;
}

class MovieResource extends JsonAPIResource<Movie> {
  characters(): Characters {
    return new Characters(this.url, this.auth);
  }
}

class MoviesWithCharacters extends JsonAPICollection<Movie> {
  readonly endpoint = "/movies";
  readonly schema = Movie;

  // Override resource() so it returns a MovieResource instead of the base JsonAPIResource
  override resource(resourceId: string): MovieResource {
    const client = new JsonAPIClient<Movie>(
      `${this.baseUrl}${this.endpoint}/${encodeURIComponent(resourceId)}`,
      this.schema,
      this.auth,
    );
    return new MovieResource(client, this.include);
  }
}

const moviesWithCharacters = new MoviesWithCharacters(
  "https://your_api.domain.com/v1",
);

// GET https://your_api.domain.com/v1/movies/34/characters?page[number]=1
// ...
// GET https://your_api.domain.com/v1/movies/34/characters?page[number]=5
const charactersList = await moviesWithCharacters
  .resource("34")
  .characters()
  .list()
  .all();
```

### Custom encoding/decoding

Model fields are plain [zod](https://zod.dev/) schemas, so reading a non-string attribute (like a date) is just a matter of using zod's own coercion/transform features — no separate registry needed:

```ts
import {
  JsonAPICollection,
  JsonAPIResourceSchema,
} from "jsonapi-client-framework-ts";
import { z } from "zod";

const Movie = JsonAPIResourceSchema.extend({
  title: z.string(),
  // GET .../movies/178 -> attributes.released_at is the string "1993-06-11T00:00:00.000Z"
  // released_at ends up as a real Date instance here
  released_at: z.coerce.date(),
});
type Movie = z.infer<typeof Movie>;

class Movies extends JsonAPICollection<Movie> {
  readonly endpoint = "/movies";
  readonly schema = Movie;
}

const movies = new Movies("https://your_api.domain.com/v1");
const movie = await movies.resource("178").get();
movie.released_at.getFullYear(); // => 1993
```

Writing a `Date` back doesn't need anything special either — `JSON.stringify` already serializes `Date` values to an ISO 8601 string on its own:

```ts
// PATCH .../movies/178
// Request body: { "data": { "attributes": { "released_at": "1993-06-11T00:00:00.000Z" } } }
await movies
  .resource("178")
  .update({ released_at: new Date("1993-06-11T00:00:00.000Z") });
```
