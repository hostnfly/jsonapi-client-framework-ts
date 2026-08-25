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

// PUT https://your_api.domain.com/v1/movies/179
const updatedMovie = await movies.resource("179").update({ year: 1993 });
```

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

Full documentation coming as the port progresses.
