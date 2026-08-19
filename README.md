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

Full documentation coming as the port progresses.
