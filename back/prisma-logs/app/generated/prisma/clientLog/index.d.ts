
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model TtsDailyUsage
 * 
 */
export type TtsDailyUsage = $Result.DefaultSelection<Prisma.$TtsDailyUsagePayload>
/**
 * Model TtsWeekVoice
 * 
 */
export type TtsWeekVoice = $Result.DefaultSelection<Prisma.$TtsWeekVoicePayload>
/**
 * Model TtsSettings
 * 
 */
export type TtsSettings = $Result.DefaultSelection<Prisma.$TtsSettingsPayload>
/**
 * Model TtsVoiceOverride
 * 
 */
export type TtsVoiceOverride = $Result.DefaultSelection<Prisma.$TtsVoiceOverridePayload>
/**
 * Model NameDictionary
 * 
 */
export type NameDictionary = $Result.DefaultSelection<Prisma.$NameDictionaryPayload>
/**
 * Model TtsVoiceTest
 * 
 */
export type TtsVoiceTest = $Result.DefaultSelection<Prisma.$TtsVoiceTestPayload>
/**
 * Model ttsEvent
 * 
 */
export type ttsEvent = $Result.DefaultSelection<Prisma.$ttsEventPayload>
/**
 * Model token
 * 
 */
export type token = $Result.DefaultSelection<Prisma.$tokenPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more TtsDailyUsages
 * const ttsDailyUsages = await prisma.ttsDailyUsage.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more TtsDailyUsages
   * const ttsDailyUsages = await prisma.ttsDailyUsage.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.ttsDailyUsage`: Exposes CRUD operations for the **TtsDailyUsage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TtsDailyUsages
    * const ttsDailyUsages = await prisma.ttsDailyUsage.findMany()
    * ```
    */
  get ttsDailyUsage(): Prisma.TtsDailyUsageDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ttsWeekVoice`: Exposes CRUD operations for the **TtsWeekVoice** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TtsWeekVoices
    * const ttsWeekVoices = await prisma.ttsWeekVoice.findMany()
    * ```
    */
  get ttsWeekVoice(): Prisma.TtsWeekVoiceDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ttsSettings`: Exposes CRUD operations for the **TtsSettings** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TtsSettings
    * const ttsSettings = await prisma.ttsSettings.findMany()
    * ```
    */
  get ttsSettings(): Prisma.TtsSettingsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ttsVoiceOverride`: Exposes CRUD operations for the **TtsVoiceOverride** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TtsVoiceOverrides
    * const ttsVoiceOverrides = await prisma.ttsVoiceOverride.findMany()
    * ```
    */
  get ttsVoiceOverride(): Prisma.TtsVoiceOverrideDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nameDictionary`: Exposes CRUD operations for the **NameDictionary** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more NameDictionaries
    * const nameDictionaries = await prisma.nameDictionary.findMany()
    * ```
    */
  get nameDictionary(): Prisma.NameDictionaryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ttsVoiceTest`: Exposes CRUD operations for the **TtsVoiceTest** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TtsVoiceTests
    * const ttsVoiceTests = await prisma.ttsVoiceTest.findMany()
    * ```
    */
  get ttsVoiceTest(): Prisma.TtsVoiceTestDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ttsEvent`: Exposes CRUD operations for the **ttsEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TtsEvents
    * const ttsEvents = await prisma.ttsEvent.findMany()
    * ```
    */
  get ttsEvent(): Prisma.ttsEventDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.token`: Exposes CRUD operations for the **token** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tokens
    * const tokens = await prisma.token.findMany()
    * ```
    */
  get token(): Prisma.tokenDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.1.0
   * Query Engine version: ab635e6b9d606fa5c8fb8b1a7f909c3c3c1c98ba
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    TtsDailyUsage: 'TtsDailyUsage',
    TtsWeekVoice: 'TtsWeekVoice',
    TtsSettings: 'TtsSettings',
    TtsVoiceOverride: 'TtsVoiceOverride',
    NameDictionary: 'NameDictionary',
    TtsVoiceTest: 'TtsVoiceTest',
    ttsEvent: 'ttsEvent',
    token: 'token'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "ttsDailyUsage" | "ttsWeekVoice" | "ttsSettings" | "ttsVoiceOverride" | "nameDictionary" | "ttsVoiceTest" | "ttsEvent" | "token"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      TtsDailyUsage: {
        payload: Prisma.$TtsDailyUsagePayload<ExtArgs>
        fields: Prisma.TtsDailyUsageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TtsDailyUsageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TtsDailyUsageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>
          }
          findFirst: {
            args: Prisma.TtsDailyUsageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TtsDailyUsageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>
          }
          findMany: {
            args: Prisma.TtsDailyUsageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>[]
          }
          create: {
            args: Prisma.TtsDailyUsageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>
          }
          createMany: {
            args: Prisma.TtsDailyUsageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TtsDailyUsageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>[]
          }
          delete: {
            args: Prisma.TtsDailyUsageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>
          }
          update: {
            args: Prisma.TtsDailyUsageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>
          }
          deleteMany: {
            args: Prisma.TtsDailyUsageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TtsDailyUsageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TtsDailyUsageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>[]
          }
          upsert: {
            args: Prisma.TtsDailyUsageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsDailyUsagePayload>
          }
          aggregate: {
            args: Prisma.TtsDailyUsageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTtsDailyUsage>
          }
          groupBy: {
            args: Prisma.TtsDailyUsageGroupByArgs<ExtArgs>
            result: $Utils.Optional<TtsDailyUsageGroupByOutputType>[]
          }
          count: {
            args: Prisma.TtsDailyUsageCountArgs<ExtArgs>
            result: $Utils.Optional<TtsDailyUsageCountAggregateOutputType> | number
          }
        }
      }
      TtsWeekVoice: {
        payload: Prisma.$TtsWeekVoicePayload<ExtArgs>
        fields: Prisma.TtsWeekVoiceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TtsWeekVoiceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TtsWeekVoiceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>
          }
          findFirst: {
            args: Prisma.TtsWeekVoiceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TtsWeekVoiceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>
          }
          findMany: {
            args: Prisma.TtsWeekVoiceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>[]
          }
          create: {
            args: Prisma.TtsWeekVoiceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>
          }
          createMany: {
            args: Prisma.TtsWeekVoiceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TtsWeekVoiceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>[]
          }
          delete: {
            args: Prisma.TtsWeekVoiceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>
          }
          update: {
            args: Prisma.TtsWeekVoiceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>
          }
          deleteMany: {
            args: Prisma.TtsWeekVoiceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TtsWeekVoiceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TtsWeekVoiceUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>[]
          }
          upsert: {
            args: Prisma.TtsWeekVoiceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsWeekVoicePayload>
          }
          aggregate: {
            args: Prisma.TtsWeekVoiceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTtsWeekVoice>
          }
          groupBy: {
            args: Prisma.TtsWeekVoiceGroupByArgs<ExtArgs>
            result: $Utils.Optional<TtsWeekVoiceGroupByOutputType>[]
          }
          count: {
            args: Prisma.TtsWeekVoiceCountArgs<ExtArgs>
            result: $Utils.Optional<TtsWeekVoiceCountAggregateOutputType> | number
          }
        }
      }
      TtsSettings: {
        payload: Prisma.$TtsSettingsPayload<ExtArgs>
        fields: Prisma.TtsSettingsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TtsSettingsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TtsSettingsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>
          }
          findFirst: {
            args: Prisma.TtsSettingsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TtsSettingsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>
          }
          findMany: {
            args: Prisma.TtsSettingsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>[]
          }
          create: {
            args: Prisma.TtsSettingsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>
          }
          createMany: {
            args: Prisma.TtsSettingsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TtsSettingsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>[]
          }
          delete: {
            args: Prisma.TtsSettingsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>
          }
          update: {
            args: Prisma.TtsSettingsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>
          }
          deleteMany: {
            args: Prisma.TtsSettingsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TtsSettingsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TtsSettingsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>[]
          }
          upsert: {
            args: Prisma.TtsSettingsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsSettingsPayload>
          }
          aggregate: {
            args: Prisma.TtsSettingsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTtsSettings>
          }
          groupBy: {
            args: Prisma.TtsSettingsGroupByArgs<ExtArgs>
            result: $Utils.Optional<TtsSettingsGroupByOutputType>[]
          }
          count: {
            args: Prisma.TtsSettingsCountArgs<ExtArgs>
            result: $Utils.Optional<TtsSettingsCountAggregateOutputType> | number
          }
        }
      }
      TtsVoiceOverride: {
        payload: Prisma.$TtsVoiceOverridePayload<ExtArgs>
        fields: Prisma.TtsVoiceOverrideFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TtsVoiceOverrideFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TtsVoiceOverrideFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>
          }
          findFirst: {
            args: Prisma.TtsVoiceOverrideFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TtsVoiceOverrideFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>
          }
          findMany: {
            args: Prisma.TtsVoiceOverrideFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>[]
          }
          create: {
            args: Prisma.TtsVoiceOverrideCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>
          }
          createMany: {
            args: Prisma.TtsVoiceOverrideCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TtsVoiceOverrideCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>[]
          }
          delete: {
            args: Prisma.TtsVoiceOverrideDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>
          }
          update: {
            args: Prisma.TtsVoiceOverrideUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>
          }
          deleteMany: {
            args: Prisma.TtsVoiceOverrideDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TtsVoiceOverrideUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TtsVoiceOverrideUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>[]
          }
          upsert: {
            args: Prisma.TtsVoiceOverrideUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceOverridePayload>
          }
          aggregate: {
            args: Prisma.TtsVoiceOverrideAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTtsVoiceOverride>
          }
          groupBy: {
            args: Prisma.TtsVoiceOverrideGroupByArgs<ExtArgs>
            result: $Utils.Optional<TtsVoiceOverrideGroupByOutputType>[]
          }
          count: {
            args: Prisma.TtsVoiceOverrideCountArgs<ExtArgs>
            result: $Utils.Optional<TtsVoiceOverrideCountAggregateOutputType> | number
          }
        }
      }
      NameDictionary: {
        payload: Prisma.$NameDictionaryPayload<ExtArgs>
        fields: Prisma.NameDictionaryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.NameDictionaryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.NameDictionaryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>
          }
          findFirst: {
            args: Prisma.NameDictionaryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.NameDictionaryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>
          }
          findMany: {
            args: Prisma.NameDictionaryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>[]
          }
          create: {
            args: Prisma.NameDictionaryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>
          }
          createMany: {
            args: Prisma.NameDictionaryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.NameDictionaryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>[]
          }
          delete: {
            args: Prisma.NameDictionaryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>
          }
          update: {
            args: Prisma.NameDictionaryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>
          }
          deleteMany: {
            args: Prisma.NameDictionaryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.NameDictionaryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.NameDictionaryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>[]
          }
          upsert: {
            args: Prisma.NameDictionaryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NameDictionaryPayload>
          }
          aggregate: {
            args: Prisma.NameDictionaryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNameDictionary>
          }
          groupBy: {
            args: Prisma.NameDictionaryGroupByArgs<ExtArgs>
            result: $Utils.Optional<NameDictionaryGroupByOutputType>[]
          }
          count: {
            args: Prisma.NameDictionaryCountArgs<ExtArgs>
            result: $Utils.Optional<NameDictionaryCountAggregateOutputType> | number
          }
        }
      }
      TtsVoiceTest: {
        payload: Prisma.$TtsVoiceTestPayload<ExtArgs>
        fields: Prisma.TtsVoiceTestFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TtsVoiceTestFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TtsVoiceTestFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>
          }
          findFirst: {
            args: Prisma.TtsVoiceTestFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TtsVoiceTestFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>
          }
          findMany: {
            args: Prisma.TtsVoiceTestFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>[]
          }
          create: {
            args: Prisma.TtsVoiceTestCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>
          }
          createMany: {
            args: Prisma.TtsVoiceTestCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TtsVoiceTestCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>[]
          }
          delete: {
            args: Prisma.TtsVoiceTestDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>
          }
          update: {
            args: Prisma.TtsVoiceTestUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>
          }
          deleteMany: {
            args: Prisma.TtsVoiceTestDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TtsVoiceTestUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TtsVoiceTestUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>[]
          }
          upsert: {
            args: Prisma.TtsVoiceTestUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TtsVoiceTestPayload>
          }
          aggregate: {
            args: Prisma.TtsVoiceTestAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTtsVoiceTest>
          }
          groupBy: {
            args: Prisma.TtsVoiceTestGroupByArgs<ExtArgs>
            result: $Utils.Optional<TtsVoiceTestGroupByOutputType>[]
          }
          count: {
            args: Prisma.TtsVoiceTestCountArgs<ExtArgs>
            result: $Utils.Optional<TtsVoiceTestCountAggregateOutputType> | number
          }
        }
      }
      ttsEvent: {
        payload: Prisma.$ttsEventPayload<ExtArgs>
        fields: Prisma.ttsEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ttsEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ttsEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>
          }
          findFirst: {
            args: Prisma.ttsEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ttsEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>
          }
          findMany: {
            args: Prisma.ttsEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>[]
          }
          create: {
            args: Prisma.ttsEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>
          }
          createMany: {
            args: Prisma.ttsEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ttsEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>[]
          }
          delete: {
            args: Prisma.ttsEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>
          }
          update: {
            args: Prisma.ttsEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>
          }
          deleteMany: {
            args: Prisma.ttsEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ttsEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ttsEventUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>[]
          }
          upsert: {
            args: Prisma.ttsEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ttsEventPayload>
          }
          aggregate: {
            args: Prisma.TtsEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTtsEvent>
          }
          groupBy: {
            args: Prisma.ttsEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<TtsEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.ttsEventCountArgs<ExtArgs>
            result: $Utils.Optional<TtsEventCountAggregateOutputType> | number
          }
        }
      }
      token: {
        payload: Prisma.$tokenPayload<ExtArgs>
        fields: Prisma.tokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.tokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.tokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          findFirst: {
            args: Prisma.tokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.tokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          findMany: {
            args: Prisma.tokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>[]
          }
          create: {
            args: Prisma.tokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          createMany: {
            args: Prisma.tokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.tokenCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>[]
          }
          delete: {
            args: Prisma.tokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          update: {
            args: Prisma.tokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          deleteMany: {
            args: Prisma.tokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.tokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.tokenUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>[]
          }
          upsert: {
            args: Prisma.tokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$tokenPayload>
          }
          aggregate: {
            args: Prisma.TokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateToken>
          }
          groupBy: {
            args: Prisma.tokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<TokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.tokenCountArgs<ExtArgs>
            result: $Utils.Optional<TokenCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    ttsDailyUsage?: TtsDailyUsageOmit
    ttsWeekVoice?: TtsWeekVoiceOmit
    ttsSettings?: TtsSettingsOmit
    ttsVoiceOverride?: TtsVoiceOverrideOmit
    nameDictionary?: NameDictionaryOmit
    ttsVoiceTest?: TtsVoiceTestOmit
    ttsEvent?: ttsEventOmit
    token?: tokenOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model TtsDailyUsage
   */

  export type AggregateTtsDailyUsage = {
    _count: TtsDailyUsageCountAggregateOutputType | null
    _avg: TtsDailyUsageAvgAggregateOutputType | null
    _sum: TtsDailyUsageSumAggregateOutputType | null
    _min: TtsDailyUsageMinAggregateOutputType | null
    _max: TtsDailyUsageMaxAggregateOutputType | null
  }

  export type TtsDailyUsageAvgAggregateOutputType = {
    id: number | null
    chars: number | null
    requests: number | null
  }

  export type TtsDailyUsageSumAggregateOutputType = {
    id: number | null
    chars: number | null
    requests: number | null
  }

  export type TtsDailyUsageMinAggregateOutputType = {
    id: number | null
    date: Date | null
    chars: number | null
    requests: number | null
  }

  export type TtsDailyUsageMaxAggregateOutputType = {
    id: number | null
    date: Date | null
    chars: number | null
    requests: number | null
  }

  export type TtsDailyUsageCountAggregateOutputType = {
    id: number
    date: number
    chars: number
    requests: number
    _all: number
  }


  export type TtsDailyUsageAvgAggregateInputType = {
    id?: true
    chars?: true
    requests?: true
  }

  export type TtsDailyUsageSumAggregateInputType = {
    id?: true
    chars?: true
    requests?: true
  }

  export type TtsDailyUsageMinAggregateInputType = {
    id?: true
    date?: true
    chars?: true
    requests?: true
  }

  export type TtsDailyUsageMaxAggregateInputType = {
    id?: true
    date?: true
    chars?: true
    requests?: true
  }

  export type TtsDailyUsageCountAggregateInputType = {
    id?: true
    date?: true
    chars?: true
    requests?: true
    _all?: true
  }

  export type TtsDailyUsageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsDailyUsage to aggregate.
     */
    where?: TtsDailyUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsDailyUsages to fetch.
     */
    orderBy?: TtsDailyUsageOrderByWithRelationInput | TtsDailyUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TtsDailyUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsDailyUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsDailyUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TtsDailyUsages
    **/
    _count?: true | TtsDailyUsageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TtsDailyUsageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TtsDailyUsageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TtsDailyUsageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TtsDailyUsageMaxAggregateInputType
  }

  export type GetTtsDailyUsageAggregateType<T extends TtsDailyUsageAggregateArgs> = {
        [P in keyof T & keyof AggregateTtsDailyUsage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTtsDailyUsage[P]>
      : GetScalarType<T[P], AggregateTtsDailyUsage[P]>
  }




  export type TtsDailyUsageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TtsDailyUsageWhereInput
    orderBy?: TtsDailyUsageOrderByWithAggregationInput | TtsDailyUsageOrderByWithAggregationInput[]
    by: TtsDailyUsageScalarFieldEnum[] | TtsDailyUsageScalarFieldEnum
    having?: TtsDailyUsageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TtsDailyUsageCountAggregateInputType | true
    _avg?: TtsDailyUsageAvgAggregateInputType
    _sum?: TtsDailyUsageSumAggregateInputType
    _min?: TtsDailyUsageMinAggregateInputType
    _max?: TtsDailyUsageMaxAggregateInputType
  }

  export type TtsDailyUsageGroupByOutputType = {
    id: number
    date: Date
    chars: number
    requests: number
    _count: TtsDailyUsageCountAggregateOutputType | null
    _avg: TtsDailyUsageAvgAggregateOutputType | null
    _sum: TtsDailyUsageSumAggregateOutputType | null
    _min: TtsDailyUsageMinAggregateOutputType | null
    _max: TtsDailyUsageMaxAggregateOutputType | null
  }

  type GetTtsDailyUsageGroupByPayload<T extends TtsDailyUsageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TtsDailyUsageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TtsDailyUsageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TtsDailyUsageGroupByOutputType[P]>
            : GetScalarType<T[P], TtsDailyUsageGroupByOutputType[P]>
        }
      >
    >


  export type TtsDailyUsageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    chars?: boolean
    requests?: boolean
  }, ExtArgs["result"]["ttsDailyUsage"]>

  export type TtsDailyUsageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    chars?: boolean
    requests?: boolean
  }, ExtArgs["result"]["ttsDailyUsage"]>

  export type TtsDailyUsageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    chars?: boolean
    requests?: boolean
  }, ExtArgs["result"]["ttsDailyUsage"]>

  export type TtsDailyUsageSelectScalar = {
    id?: boolean
    date?: boolean
    chars?: boolean
    requests?: boolean
  }

  export type TtsDailyUsageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "date" | "chars" | "requests", ExtArgs["result"]["ttsDailyUsage"]>

  export type $TtsDailyUsagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TtsDailyUsage"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      date: Date
      chars: number
      requests: number
    }, ExtArgs["result"]["ttsDailyUsage"]>
    composites: {}
  }

  type TtsDailyUsageGetPayload<S extends boolean | null | undefined | TtsDailyUsageDefaultArgs> = $Result.GetResult<Prisma.$TtsDailyUsagePayload, S>

  type TtsDailyUsageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TtsDailyUsageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TtsDailyUsageCountAggregateInputType | true
    }

  export interface TtsDailyUsageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TtsDailyUsage'], meta: { name: 'TtsDailyUsage' } }
    /**
     * Find zero or one TtsDailyUsage that matches the filter.
     * @param {TtsDailyUsageFindUniqueArgs} args - Arguments to find a TtsDailyUsage
     * @example
     * // Get one TtsDailyUsage
     * const ttsDailyUsage = await prisma.ttsDailyUsage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TtsDailyUsageFindUniqueArgs>(args: SelectSubset<T, TtsDailyUsageFindUniqueArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TtsDailyUsage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TtsDailyUsageFindUniqueOrThrowArgs} args - Arguments to find a TtsDailyUsage
     * @example
     * // Get one TtsDailyUsage
     * const ttsDailyUsage = await prisma.ttsDailyUsage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TtsDailyUsageFindUniqueOrThrowArgs>(args: SelectSubset<T, TtsDailyUsageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsDailyUsage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsDailyUsageFindFirstArgs} args - Arguments to find a TtsDailyUsage
     * @example
     * // Get one TtsDailyUsage
     * const ttsDailyUsage = await prisma.ttsDailyUsage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TtsDailyUsageFindFirstArgs>(args?: SelectSubset<T, TtsDailyUsageFindFirstArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsDailyUsage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsDailyUsageFindFirstOrThrowArgs} args - Arguments to find a TtsDailyUsage
     * @example
     * // Get one TtsDailyUsage
     * const ttsDailyUsage = await prisma.ttsDailyUsage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TtsDailyUsageFindFirstOrThrowArgs>(args?: SelectSubset<T, TtsDailyUsageFindFirstOrThrowArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TtsDailyUsages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsDailyUsageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TtsDailyUsages
     * const ttsDailyUsages = await prisma.ttsDailyUsage.findMany()
     * 
     * // Get first 10 TtsDailyUsages
     * const ttsDailyUsages = await prisma.ttsDailyUsage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ttsDailyUsageWithIdOnly = await prisma.ttsDailyUsage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TtsDailyUsageFindManyArgs>(args?: SelectSubset<T, TtsDailyUsageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TtsDailyUsage.
     * @param {TtsDailyUsageCreateArgs} args - Arguments to create a TtsDailyUsage.
     * @example
     * // Create one TtsDailyUsage
     * const TtsDailyUsage = await prisma.ttsDailyUsage.create({
     *   data: {
     *     // ... data to create a TtsDailyUsage
     *   }
     * })
     * 
     */
    create<T extends TtsDailyUsageCreateArgs>(args: SelectSubset<T, TtsDailyUsageCreateArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TtsDailyUsages.
     * @param {TtsDailyUsageCreateManyArgs} args - Arguments to create many TtsDailyUsages.
     * @example
     * // Create many TtsDailyUsages
     * const ttsDailyUsage = await prisma.ttsDailyUsage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TtsDailyUsageCreateManyArgs>(args?: SelectSubset<T, TtsDailyUsageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TtsDailyUsages and returns the data saved in the database.
     * @param {TtsDailyUsageCreateManyAndReturnArgs} args - Arguments to create many TtsDailyUsages.
     * @example
     * // Create many TtsDailyUsages
     * const ttsDailyUsage = await prisma.ttsDailyUsage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TtsDailyUsages and only return the `id`
     * const ttsDailyUsageWithIdOnly = await prisma.ttsDailyUsage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TtsDailyUsageCreateManyAndReturnArgs>(args?: SelectSubset<T, TtsDailyUsageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TtsDailyUsage.
     * @param {TtsDailyUsageDeleteArgs} args - Arguments to delete one TtsDailyUsage.
     * @example
     * // Delete one TtsDailyUsage
     * const TtsDailyUsage = await prisma.ttsDailyUsage.delete({
     *   where: {
     *     // ... filter to delete one TtsDailyUsage
     *   }
     * })
     * 
     */
    delete<T extends TtsDailyUsageDeleteArgs>(args: SelectSubset<T, TtsDailyUsageDeleteArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TtsDailyUsage.
     * @param {TtsDailyUsageUpdateArgs} args - Arguments to update one TtsDailyUsage.
     * @example
     * // Update one TtsDailyUsage
     * const ttsDailyUsage = await prisma.ttsDailyUsage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TtsDailyUsageUpdateArgs>(args: SelectSubset<T, TtsDailyUsageUpdateArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TtsDailyUsages.
     * @param {TtsDailyUsageDeleteManyArgs} args - Arguments to filter TtsDailyUsages to delete.
     * @example
     * // Delete a few TtsDailyUsages
     * const { count } = await prisma.ttsDailyUsage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TtsDailyUsageDeleteManyArgs>(args?: SelectSubset<T, TtsDailyUsageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsDailyUsages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsDailyUsageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TtsDailyUsages
     * const ttsDailyUsage = await prisma.ttsDailyUsage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TtsDailyUsageUpdateManyArgs>(args: SelectSubset<T, TtsDailyUsageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsDailyUsages and returns the data updated in the database.
     * @param {TtsDailyUsageUpdateManyAndReturnArgs} args - Arguments to update many TtsDailyUsages.
     * @example
     * // Update many TtsDailyUsages
     * const ttsDailyUsage = await prisma.ttsDailyUsage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TtsDailyUsages and only return the `id`
     * const ttsDailyUsageWithIdOnly = await prisma.ttsDailyUsage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TtsDailyUsageUpdateManyAndReturnArgs>(args: SelectSubset<T, TtsDailyUsageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TtsDailyUsage.
     * @param {TtsDailyUsageUpsertArgs} args - Arguments to update or create a TtsDailyUsage.
     * @example
     * // Update or create a TtsDailyUsage
     * const ttsDailyUsage = await prisma.ttsDailyUsage.upsert({
     *   create: {
     *     // ... data to create a TtsDailyUsage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TtsDailyUsage we want to update
     *   }
     * })
     */
    upsert<T extends TtsDailyUsageUpsertArgs>(args: SelectSubset<T, TtsDailyUsageUpsertArgs<ExtArgs>>): Prisma__TtsDailyUsageClient<$Result.GetResult<Prisma.$TtsDailyUsagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TtsDailyUsages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsDailyUsageCountArgs} args - Arguments to filter TtsDailyUsages to count.
     * @example
     * // Count the number of TtsDailyUsages
     * const count = await prisma.ttsDailyUsage.count({
     *   where: {
     *     // ... the filter for the TtsDailyUsages we want to count
     *   }
     * })
    **/
    count<T extends TtsDailyUsageCountArgs>(
      args?: Subset<T, TtsDailyUsageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TtsDailyUsageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TtsDailyUsage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsDailyUsageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TtsDailyUsageAggregateArgs>(args: Subset<T, TtsDailyUsageAggregateArgs>): Prisma.PrismaPromise<GetTtsDailyUsageAggregateType<T>>

    /**
     * Group by TtsDailyUsage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsDailyUsageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TtsDailyUsageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TtsDailyUsageGroupByArgs['orderBy'] }
        : { orderBy?: TtsDailyUsageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TtsDailyUsageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTtsDailyUsageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TtsDailyUsage model
   */
  readonly fields: TtsDailyUsageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TtsDailyUsage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TtsDailyUsageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TtsDailyUsage model
   */
  interface TtsDailyUsageFieldRefs {
    readonly id: FieldRef<"TtsDailyUsage", 'Int'>
    readonly date: FieldRef<"TtsDailyUsage", 'DateTime'>
    readonly chars: FieldRef<"TtsDailyUsage", 'Int'>
    readonly requests: FieldRef<"TtsDailyUsage", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * TtsDailyUsage findUnique
   */
  export type TtsDailyUsageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * Filter, which TtsDailyUsage to fetch.
     */
    where: TtsDailyUsageWhereUniqueInput
  }

  /**
   * TtsDailyUsage findUniqueOrThrow
   */
  export type TtsDailyUsageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * Filter, which TtsDailyUsage to fetch.
     */
    where: TtsDailyUsageWhereUniqueInput
  }

  /**
   * TtsDailyUsage findFirst
   */
  export type TtsDailyUsageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * Filter, which TtsDailyUsage to fetch.
     */
    where?: TtsDailyUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsDailyUsages to fetch.
     */
    orderBy?: TtsDailyUsageOrderByWithRelationInput | TtsDailyUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsDailyUsages.
     */
    cursor?: TtsDailyUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsDailyUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsDailyUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsDailyUsages.
     */
    distinct?: TtsDailyUsageScalarFieldEnum | TtsDailyUsageScalarFieldEnum[]
  }

  /**
   * TtsDailyUsage findFirstOrThrow
   */
  export type TtsDailyUsageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * Filter, which TtsDailyUsage to fetch.
     */
    where?: TtsDailyUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsDailyUsages to fetch.
     */
    orderBy?: TtsDailyUsageOrderByWithRelationInput | TtsDailyUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsDailyUsages.
     */
    cursor?: TtsDailyUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsDailyUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsDailyUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsDailyUsages.
     */
    distinct?: TtsDailyUsageScalarFieldEnum | TtsDailyUsageScalarFieldEnum[]
  }

  /**
   * TtsDailyUsage findMany
   */
  export type TtsDailyUsageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * Filter, which TtsDailyUsages to fetch.
     */
    where?: TtsDailyUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsDailyUsages to fetch.
     */
    orderBy?: TtsDailyUsageOrderByWithRelationInput | TtsDailyUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TtsDailyUsages.
     */
    cursor?: TtsDailyUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsDailyUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsDailyUsages.
     */
    skip?: number
    distinct?: TtsDailyUsageScalarFieldEnum | TtsDailyUsageScalarFieldEnum[]
  }

  /**
   * TtsDailyUsage create
   */
  export type TtsDailyUsageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * The data needed to create a TtsDailyUsage.
     */
    data: XOR<TtsDailyUsageCreateInput, TtsDailyUsageUncheckedCreateInput>
  }

  /**
   * TtsDailyUsage createMany
   */
  export type TtsDailyUsageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TtsDailyUsages.
     */
    data: TtsDailyUsageCreateManyInput | TtsDailyUsageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsDailyUsage createManyAndReturn
   */
  export type TtsDailyUsageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * The data used to create many TtsDailyUsages.
     */
    data: TtsDailyUsageCreateManyInput | TtsDailyUsageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsDailyUsage update
   */
  export type TtsDailyUsageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * The data needed to update a TtsDailyUsage.
     */
    data: XOR<TtsDailyUsageUpdateInput, TtsDailyUsageUncheckedUpdateInput>
    /**
     * Choose, which TtsDailyUsage to update.
     */
    where: TtsDailyUsageWhereUniqueInput
  }

  /**
   * TtsDailyUsage updateMany
   */
  export type TtsDailyUsageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TtsDailyUsages.
     */
    data: XOR<TtsDailyUsageUpdateManyMutationInput, TtsDailyUsageUncheckedUpdateManyInput>
    /**
     * Filter which TtsDailyUsages to update
     */
    where?: TtsDailyUsageWhereInput
    /**
     * Limit how many TtsDailyUsages to update.
     */
    limit?: number
  }

  /**
   * TtsDailyUsage updateManyAndReturn
   */
  export type TtsDailyUsageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * The data used to update TtsDailyUsages.
     */
    data: XOR<TtsDailyUsageUpdateManyMutationInput, TtsDailyUsageUncheckedUpdateManyInput>
    /**
     * Filter which TtsDailyUsages to update
     */
    where?: TtsDailyUsageWhereInput
    /**
     * Limit how many TtsDailyUsages to update.
     */
    limit?: number
  }

  /**
   * TtsDailyUsage upsert
   */
  export type TtsDailyUsageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * The filter to search for the TtsDailyUsage to update in case it exists.
     */
    where: TtsDailyUsageWhereUniqueInput
    /**
     * In case the TtsDailyUsage found by the `where` argument doesn't exist, create a new TtsDailyUsage with this data.
     */
    create: XOR<TtsDailyUsageCreateInput, TtsDailyUsageUncheckedCreateInput>
    /**
     * In case the TtsDailyUsage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TtsDailyUsageUpdateInput, TtsDailyUsageUncheckedUpdateInput>
  }

  /**
   * TtsDailyUsage delete
   */
  export type TtsDailyUsageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
    /**
     * Filter which TtsDailyUsage to delete.
     */
    where: TtsDailyUsageWhereUniqueInput
  }

  /**
   * TtsDailyUsage deleteMany
   */
  export type TtsDailyUsageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsDailyUsages to delete
     */
    where?: TtsDailyUsageWhereInput
    /**
     * Limit how many TtsDailyUsages to delete.
     */
    limit?: number
  }

  /**
   * TtsDailyUsage without action
   */
  export type TtsDailyUsageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsDailyUsage
     */
    select?: TtsDailyUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsDailyUsage
     */
    omit?: TtsDailyUsageOmit<ExtArgs> | null
  }


  /**
   * Model TtsWeekVoice
   */

  export type AggregateTtsWeekVoice = {
    _count: TtsWeekVoiceCountAggregateOutputType | null
    _avg: TtsWeekVoiceAvgAggregateOutputType | null
    _sum: TtsWeekVoiceSumAggregateOutputType | null
    _min: TtsWeekVoiceMinAggregateOutputType | null
    _max: TtsWeekVoiceMaxAggregateOutputType | null
  }

  export type TtsWeekVoiceAvgAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
  }

  export type TtsWeekVoiceSumAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
  }

  export type TtsWeekVoiceMinAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
    voiceName: string | null
    createdAt: Date | null
  }

  export type TtsWeekVoiceMaxAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
    voiceName: string | null
    createdAt: Date | null
  }

  export type TtsWeekVoiceCountAggregateOutputType = {
    id: number
    year: number
    week: number
    voiceName: number
    createdAt: number
    _all: number
  }


  export type TtsWeekVoiceAvgAggregateInputType = {
    id?: true
    year?: true
    week?: true
  }

  export type TtsWeekVoiceSumAggregateInputType = {
    id?: true
    year?: true
    week?: true
  }

  export type TtsWeekVoiceMinAggregateInputType = {
    id?: true
    year?: true
    week?: true
    voiceName?: true
    createdAt?: true
  }

  export type TtsWeekVoiceMaxAggregateInputType = {
    id?: true
    year?: true
    week?: true
    voiceName?: true
    createdAt?: true
  }

  export type TtsWeekVoiceCountAggregateInputType = {
    id?: true
    year?: true
    week?: true
    voiceName?: true
    createdAt?: true
    _all?: true
  }

  export type TtsWeekVoiceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsWeekVoice to aggregate.
     */
    where?: TtsWeekVoiceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsWeekVoices to fetch.
     */
    orderBy?: TtsWeekVoiceOrderByWithRelationInput | TtsWeekVoiceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TtsWeekVoiceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsWeekVoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsWeekVoices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TtsWeekVoices
    **/
    _count?: true | TtsWeekVoiceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TtsWeekVoiceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TtsWeekVoiceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TtsWeekVoiceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TtsWeekVoiceMaxAggregateInputType
  }

  export type GetTtsWeekVoiceAggregateType<T extends TtsWeekVoiceAggregateArgs> = {
        [P in keyof T & keyof AggregateTtsWeekVoice]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTtsWeekVoice[P]>
      : GetScalarType<T[P], AggregateTtsWeekVoice[P]>
  }




  export type TtsWeekVoiceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TtsWeekVoiceWhereInput
    orderBy?: TtsWeekVoiceOrderByWithAggregationInput | TtsWeekVoiceOrderByWithAggregationInput[]
    by: TtsWeekVoiceScalarFieldEnum[] | TtsWeekVoiceScalarFieldEnum
    having?: TtsWeekVoiceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TtsWeekVoiceCountAggregateInputType | true
    _avg?: TtsWeekVoiceAvgAggregateInputType
    _sum?: TtsWeekVoiceSumAggregateInputType
    _min?: TtsWeekVoiceMinAggregateInputType
    _max?: TtsWeekVoiceMaxAggregateInputType
  }

  export type TtsWeekVoiceGroupByOutputType = {
    id: number
    year: number
    week: number
    voiceName: string
    createdAt: Date
    _count: TtsWeekVoiceCountAggregateOutputType | null
    _avg: TtsWeekVoiceAvgAggregateOutputType | null
    _sum: TtsWeekVoiceSumAggregateOutputType | null
    _min: TtsWeekVoiceMinAggregateOutputType | null
    _max: TtsWeekVoiceMaxAggregateOutputType | null
  }

  type GetTtsWeekVoiceGroupByPayload<T extends TtsWeekVoiceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TtsWeekVoiceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TtsWeekVoiceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TtsWeekVoiceGroupByOutputType[P]>
            : GetScalarType<T[P], TtsWeekVoiceGroupByOutputType[P]>
        }
      >
    >


  export type TtsWeekVoiceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsWeekVoice"]>

  export type TtsWeekVoiceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsWeekVoice"]>

  export type TtsWeekVoiceSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsWeekVoice"]>

  export type TtsWeekVoiceSelectScalar = {
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    createdAt?: boolean
  }

  export type TtsWeekVoiceOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "year" | "week" | "voiceName" | "createdAt", ExtArgs["result"]["ttsWeekVoice"]>

  export type $TtsWeekVoicePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TtsWeekVoice"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      year: number
      week: number
      voiceName: string
      createdAt: Date
    }, ExtArgs["result"]["ttsWeekVoice"]>
    composites: {}
  }

  type TtsWeekVoiceGetPayload<S extends boolean | null | undefined | TtsWeekVoiceDefaultArgs> = $Result.GetResult<Prisma.$TtsWeekVoicePayload, S>

  type TtsWeekVoiceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TtsWeekVoiceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TtsWeekVoiceCountAggregateInputType | true
    }

  export interface TtsWeekVoiceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TtsWeekVoice'], meta: { name: 'TtsWeekVoice' } }
    /**
     * Find zero or one TtsWeekVoice that matches the filter.
     * @param {TtsWeekVoiceFindUniqueArgs} args - Arguments to find a TtsWeekVoice
     * @example
     * // Get one TtsWeekVoice
     * const ttsWeekVoice = await prisma.ttsWeekVoice.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TtsWeekVoiceFindUniqueArgs>(args: SelectSubset<T, TtsWeekVoiceFindUniqueArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TtsWeekVoice that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TtsWeekVoiceFindUniqueOrThrowArgs} args - Arguments to find a TtsWeekVoice
     * @example
     * // Get one TtsWeekVoice
     * const ttsWeekVoice = await prisma.ttsWeekVoice.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TtsWeekVoiceFindUniqueOrThrowArgs>(args: SelectSubset<T, TtsWeekVoiceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsWeekVoice that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsWeekVoiceFindFirstArgs} args - Arguments to find a TtsWeekVoice
     * @example
     * // Get one TtsWeekVoice
     * const ttsWeekVoice = await prisma.ttsWeekVoice.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TtsWeekVoiceFindFirstArgs>(args?: SelectSubset<T, TtsWeekVoiceFindFirstArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsWeekVoice that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsWeekVoiceFindFirstOrThrowArgs} args - Arguments to find a TtsWeekVoice
     * @example
     * // Get one TtsWeekVoice
     * const ttsWeekVoice = await prisma.ttsWeekVoice.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TtsWeekVoiceFindFirstOrThrowArgs>(args?: SelectSubset<T, TtsWeekVoiceFindFirstOrThrowArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TtsWeekVoices that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsWeekVoiceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TtsWeekVoices
     * const ttsWeekVoices = await prisma.ttsWeekVoice.findMany()
     * 
     * // Get first 10 TtsWeekVoices
     * const ttsWeekVoices = await prisma.ttsWeekVoice.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ttsWeekVoiceWithIdOnly = await prisma.ttsWeekVoice.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TtsWeekVoiceFindManyArgs>(args?: SelectSubset<T, TtsWeekVoiceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TtsWeekVoice.
     * @param {TtsWeekVoiceCreateArgs} args - Arguments to create a TtsWeekVoice.
     * @example
     * // Create one TtsWeekVoice
     * const TtsWeekVoice = await prisma.ttsWeekVoice.create({
     *   data: {
     *     // ... data to create a TtsWeekVoice
     *   }
     * })
     * 
     */
    create<T extends TtsWeekVoiceCreateArgs>(args: SelectSubset<T, TtsWeekVoiceCreateArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TtsWeekVoices.
     * @param {TtsWeekVoiceCreateManyArgs} args - Arguments to create many TtsWeekVoices.
     * @example
     * // Create many TtsWeekVoices
     * const ttsWeekVoice = await prisma.ttsWeekVoice.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TtsWeekVoiceCreateManyArgs>(args?: SelectSubset<T, TtsWeekVoiceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TtsWeekVoices and returns the data saved in the database.
     * @param {TtsWeekVoiceCreateManyAndReturnArgs} args - Arguments to create many TtsWeekVoices.
     * @example
     * // Create many TtsWeekVoices
     * const ttsWeekVoice = await prisma.ttsWeekVoice.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TtsWeekVoices and only return the `id`
     * const ttsWeekVoiceWithIdOnly = await prisma.ttsWeekVoice.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TtsWeekVoiceCreateManyAndReturnArgs>(args?: SelectSubset<T, TtsWeekVoiceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TtsWeekVoice.
     * @param {TtsWeekVoiceDeleteArgs} args - Arguments to delete one TtsWeekVoice.
     * @example
     * // Delete one TtsWeekVoice
     * const TtsWeekVoice = await prisma.ttsWeekVoice.delete({
     *   where: {
     *     // ... filter to delete one TtsWeekVoice
     *   }
     * })
     * 
     */
    delete<T extends TtsWeekVoiceDeleteArgs>(args: SelectSubset<T, TtsWeekVoiceDeleteArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TtsWeekVoice.
     * @param {TtsWeekVoiceUpdateArgs} args - Arguments to update one TtsWeekVoice.
     * @example
     * // Update one TtsWeekVoice
     * const ttsWeekVoice = await prisma.ttsWeekVoice.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TtsWeekVoiceUpdateArgs>(args: SelectSubset<T, TtsWeekVoiceUpdateArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TtsWeekVoices.
     * @param {TtsWeekVoiceDeleteManyArgs} args - Arguments to filter TtsWeekVoices to delete.
     * @example
     * // Delete a few TtsWeekVoices
     * const { count } = await prisma.ttsWeekVoice.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TtsWeekVoiceDeleteManyArgs>(args?: SelectSubset<T, TtsWeekVoiceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsWeekVoices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsWeekVoiceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TtsWeekVoices
     * const ttsWeekVoice = await prisma.ttsWeekVoice.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TtsWeekVoiceUpdateManyArgs>(args: SelectSubset<T, TtsWeekVoiceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsWeekVoices and returns the data updated in the database.
     * @param {TtsWeekVoiceUpdateManyAndReturnArgs} args - Arguments to update many TtsWeekVoices.
     * @example
     * // Update many TtsWeekVoices
     * const ttsWeekVoice = await prisma.ttsWeekVoice.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TtsWeekVoices and only return the `id`
     * const ttsWeekVoiceWithIdOnly = await prisma.ttsWeekVoice.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TtsWeekVoiceUpdateManyAndReturnArgs>(args: SelectSubset<T, TtsWeekVoiceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TtsWeekVoice.
     * @param {TtsWeekVoiceUpsertArgs} args - Arguments to update or create a TtsWeekVoice.
     * @example
     * // Update or create a TtsWeekVoice
     * const ttsWeekVoice = await prisma.ttsWeekVoice.upsert({
     *   create: {
     *     // ... data to create a TtsWeekVoice
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TtsWeekVoice we want to update
     *   }
     * })
     */
    upsert<T extends TtsWeekVoiceUpsertArgs>(args: SelectSubset<T, TtsWeekVoiceUpsertArgs<ExtArgs>>): Prisma__TtsWeekVoiceClient<$Result.GetResult<Prisma.$TtsWeekVoicePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TtsWeekVoices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsWeekVoiceCountArgs} args - Arguments to filter TtsWeekVoices to count.
     * @example
     * // Count the number of TtsWeekVoices
     * const count = await prisma.ttsWeekVoice.count({
     *   where: {
     *     // ... the filter for the TtsWeekVoices we want to count
     *   }
     * })
    **/
    count<T extends TtsWeekVoiceCountArgs>(
      args?: Subset<T, TtsWeekVoiceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TtsWeekVoiceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TtsWeekVoice.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsWeekVoiceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TtsWeekVoiceAggregateArgs>(args: Subset<T, TtsWeekVoiceAggregateArgs>): Prisma.PrismaPromise<GetTtsWeekVoiceAggregateType<T>>

    /**
     * Group by TtsWeekVoice.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsWeekVoiceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TtsWeekVoiceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TtsWeekVoiceGroupByArgs['orderBy'] }
        : { orderBy?: TtsWeekVoiceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TtsWeekVoiceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTtsWeekVoiceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TtsWeekVoice model
   */
  readonly fields: TtsWeekVoiceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TtsWeekVoice.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TtsWeekVoiceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TtsWeekVoice model
   */
  interface TtsWeekVoiceFieldRefs {
    readonly id: FieldRef<"TtsWeekVoice", 'Int'>
    readonly year: FieldRef<"TtsWeekVoice", 'Int'>
    readonly week: FieldRef<"TtsWeekVoice", 'Int'>
    readonly voiceName: FieldRef<"TtsWeekVoice", 'String'>
    readonly createdAt: FieldRef<"TtsWeekVoice", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TtsWeekVoice findUnique
   */
  export type TtsWeekVoiceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * Filter, which TtsWeekVoice to fetch.
     */
    where: TtsWeekVoiceWhereUniqueInput
  }

  /**
   * TtsWeekVoice findUniqueOrThrow
   */
  export type TtsWeekVoiceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * Filter, which TtsWeekVoice to fetch.
     */
    where: TtsWeekVoiceWhereUniqueInput
  }

  /**
   * TtsWeekVoice findFirst
   */
  export type TtsWeekVoiceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * Filter, which TtsWeekVoice to fetch.
     */
    where?: TtsWeekVoiceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsWeekVoices to fetch.
     */
    orderBy?: TtsWeekVoiceOrderByWithRelationInput | TtsWeekVoiceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsWeekVoices.
     */
    cursor?: TtsWeekVoiceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsWeekVoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsWeekVoices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsWeekVoices.
     */
    distinct?: TtsWeekVoiceScalarFieldEnum | TtsWeekVoiceScalarFieldEnum[]
  }

  /**
   * TtsWeekVoice findFirstOrThrow
   */
  export type TtsWeekVoiceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * Filter, which TtsWeekVoice to fetch.
     */
    where?: TtsWeekVoiceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsWeekVoices to fetch.
     */
    orderBy?: TtsWeekVoiceOrderByWithRelationInput | TtsWeekVoiceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsWeekVoices.
     */
    cursor?: TtsWeekVoiceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsWeekVoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsWeekVoices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsWeekVoices.
     */
    distinct?: TtsWeekVoiceScalarFieldEnum | TtsWeekVoiceScalarFieldEnum[]
  }

  /**
   * TtsWeekVoice findMany
   */
  export type TtsWeekVoiceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * Filter, which TtsWeekVoices to fetch.
     */
    where?: TtsWeekVoiceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsWeekVoices to fetch.
     */
    orderBy?: TtsWeekVoiceOrderByWithRelationInput | TtsWeekVoiceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TtsWeekVoices.
     */
    cursor?: TtsWeekVoiceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsWeekVoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsWeekVoices.
     */
    skip?: number
    distinct?: TtsWeekVoiceScalarFieldEnum | TtsWeekVoiceScalarFieldEnum[]
  }

  /**
   * TtsWeekVoice create
   */
  export type TtsWeekVoiceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * The data needed to create a TtsWeekVoice.
     */
    data: XOR<TtsWeekVoiceCreateInput, TtsWeekVoiceUncheckedCreateInput>
  }

  /**
   * TtsWeekVoice createMany
   */
  export type TtsWeekVoiceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TtsWeekVoices.
     */
    data: TtsWeekVoiceCreateManyInput | TtsWeekVoiceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsWeekVoice createManyAndReturn
   */
  export type TtsWeekVoiceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * The data used to create many TtsWeekVoices.
     */
    data: TtsWeekVoiceCreateManyInput | TtsWeekVoiceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsWeekVoice update
   */
  export type TtsWeekVoiceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * The data needed to update a TtsWeekVoice.
     */
    data: XOR<TtsWeekVoiceUpdateInput, TtsWeekVoiceUncheckedUpdateInput>
    /**
     * Choose, which TtsWeekVoice to update.
     */
    where: TtsWeekVoiceWhereUniqueInput
  }

  /**
   * TtsWeekVoice updateMany
   */
  export type TtsWeekVoiceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TtsWeekVoices.
     */
    data: XOR<TtsWeekVoiceUpdateManyMutationInput, TtsWeekVoiceUncheckedUpdateManyInput>
    /**
     * Filter which TtsWeekVoices to update
     */
    where?: TtsWeekVoiceWhereInput
    /**
     * Limit how many TtsWeekVoices to update.
     */
    limit?: number
  }

  /**
   * TtsWeekVoice updateManyAndReturn
   */
  export type TtsWeekVoiceUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * The data used to update TtsWeekVoices.
     */
    data: XOR<TtsWeekVoiceUpdateManyMutationInput, TtsWeekVoiceUncheckedUpdateManyInput>
    /**
     * Filter which TtsWeekVoices to update
     */
    where?: TtsWeekVoiceWhereInput
    /**
     * Limit how many TtsWeekVoices to update.
     */
    limit?: number
  }

  /**
   * TtsWeekVoice upsert
   */
  export type TtsWeekVoiceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * The filter to search for the TtsWeekVoice to update in case it exists.
     */
    where: TtsWeekVoiceWhereUniqueInput
    /**
     * In case the TtsWeekVoice found by the `where` argument doesn't exist, create a new TtsWeekVoice with this data.
     */
    create: XOR<TtsWeekVoiceCreateInput, TtsWeekVoiceUncheckedCreateInput>
    /**
     * In case the TtsWeekVoice was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TtsWeekVoiceUpdateInput, TtsWeekVoiceUncheckedUpdateInput>
  }

  /**
   * TtsWeekVoice delete
   */
  export type TtsWeekVoiceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
    /**
     * Filter which TtsWeekVoice to delete.
     */
    where: TtsWeekVoiceWhereUniqueInput
  }

  /**
   * TtsWeekVoice deleteMany
   */
  export type TtsWeekVoiceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsWeekVoices to delete
     */
    where?: TtsWeekVoiceWhereInput
    /**
     * Limit how many TtsWeekVoices to delete.
     */
    limit?: number
  }

  /**
   * TtsWeekVoice without action
   */
  export type TtsWeekVoiceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsWeekVoice
     */
    select?: TtsWeekVoiceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsWeekVoice
     */
    omit?: TtsWeekVoiceOmit<ExtArgs> | null
  }


  /**
   * Model TtsSettings
   */

  export type AggregateTtsSettings = {
    _count: TtsSettingsCountAggregateOutputType | null
    _avg: TtsSettingsAvgAggregateOutputType | null
    _sum: TtsSettingsSumAggregateOutputType | null
    _min: TtsSettingsMinAggregateOutputType | null
    _max: TtsSettingsMaxAggregateOutputType | null
  }

  export type TtsSettingsAvgAggregateOutputType = {
    id: number | null
    rate: number | null
    volumeSound: number | null
  }

  export type TtsSettingsSumAggregateOutputType = {
    id: number | null
    rate: number | null
    volumeSound: number | null
  }

  export type TtsSettingsMinAggregateOutputType = {
    id: number | null
    rate: number | null
    volumeSound: number | null
    updatedAt: Date | null
  }

  export type TtsSettingsMaxAggregateOutputType = {
    id: number | null
    rate: number | null
    volumeSound: number | null
    updatedAt: Date | null
  }

  export type TtsSettingsCountAggregateOutputType = {
    id: number
    rate: number
    volumeSound: number
    updatedAt: number
    _all: number
  }


  export type TtsSettingsAvgAggregateInputType = {
    id?: true
    rate?: true
    volumeSound?: true
  }

  export type TtsSettingsSumAggregateInputType = {
    id?: true
    rate?: true
    volumeSound?: true
  }

  export type TtsSettingsMinAggregateInputType = {
    id?: true
    rate?: true
    volumeSound?: true
    updatedAt?: true
  }

  export type TtsSettingsMaxAggregateInputType = {
    id?: true
    rate?: true
    volumeSound?: true
    updatedAt?: true
  }

  export type TtsSettingsCountAggregateInputType = {
    id?: true
    rate?: true
    volumeSound?: true
    updatedAt?: true
    _all?: true
  }

  export type TtsSettingsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsSettings to aggregate.
     */
    where?: TtsSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsSettings to fetch.
     */
    orderBy?: TtsSettingsOrderByWithRelationInput | TtsSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TtsSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TtsSettings
    **/
    _count?: true | TtsSettingsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TtsSettingsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TtsSettingsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TtsSettingsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TtsSettingsMaxAggregateInputType
  }

  export type GetTtsSettingsAggregateType<T extends TtsSettingsAggregateArgs> = {
        [P in keyof T & keyof AggregateTtsSettings]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTtsSettings[P]>
      : GetScalarType<T[P], AggregateTtsSettings[P]>
  }




  export type TtsSettingsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TtsSettingsWhereInput
    orderBy?: TtsSettingsOrderByWithAggregationInput | TtsSettingsOrderByWithAggregationInput[]
    by: TtsSettingsScalarFieldEnum[] | TtsSettingsScalarFieldEnum
    having?: TtsSettingsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TtsSettingsCountAggregateInputType | true
    _avg?: TtsSettingsAvgAggregateInputType
    _sum?: TtsSettingsSumAggregateInputType
    _min?: TtsSettingsMinAggregateInputType
    _max?: TtsSettingsMaxAggregateInputType
  }

  export type TtsSettingsGroupByOutputType = {
    id: number
    rate: number
    volumeSound: number
    updatedAt: Date
    _count: TtsSettingsCountAggregateOutputType | null
    _avg: TtsSettingsAvgAggregateOutputType | null
    _sum: TtsSettingsSumAggregateOutputType | null
    _min: TtsSettingsMinAggregateOutputType | null
    _max: TtsSettingsMaxAggregateOutputType | null
  }

  type GetTtsSettingsGroupByPayload<T extends TtsSettingsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TtsSettingsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TtsSettingsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TtsSettingsGroupByOutputType[P]>
            : GetScalarType<T[P], TtsSettingsGroupByOutputType[P]>
        }
      >
    >


  export type TtsSettingsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rate?: boolean
    volumeSound?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ttsSettings"]>

  export type TtsSettingsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rate?: boolean
    volumeSound?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ttsSettings"]>

  export type TtsSettingsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rate?: boolean
    volumeSound?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ttsSettings"]>

  export type TtsSettingsSelectScalar = {
    id?: boolean
    rate?: boolean
    volumeSound?: boolean
    updatedAt?: boolean
  }

  export type TtsSettingsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "rate" | "volumeSound" | "updatedAt", ExtArgs["result"]["ttsSettings"]>

  export type $TtsSettingsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TtsSettings"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      rate: number
      volumeSound: number
      updatedAt: Date
    }, ExtArgs["result"]["ttsSettings"]>
    composites: {}
  }

  type TtsSettingsGetPayload<S extends boolean | null | undefined | TtsSettingsDefaultArgs> = $Result.GetResult<Prisma.$TtsSettingsPayload, S>

  type TtsSettingsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TtsSettingsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TtsSettingsCountAggregateInputType | true
    }

  export interface TtsSettingsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TtsSettings'], meta: { name: 'TtsSettings' } }
    /**
     * Find zero or one TtsSettings that matches the filter.
     * @param {TtsSettingsFindUniqueArgs} args - Arguments to find a TtsSettings
     * @example
     * // Get one TtsSettings
     * const ttsSettings = await prisma.ttsSettings.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TtsSettingsFindUniqueArgs>(args: SelectSubset<T, TtsSettingsFindUniqueArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TtsSettings that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TtsSettingsFindUniqueOrThrowArgs} args - Arguments to find a TtsSettings
     * @example
     * // Get one TtsSettings
     * const ttsSettings = await prisma.ttsSettings.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TtsSettingsFindUniqueOrThrowArgs>(args: SelectSubset<T, TtsSettingsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsSettingsFindFirstArgs} args - Arguments to find a TtsSettings
     * @example
     * // Get one TtsSettings
     * const ttsSettings = await prisma.ttsSettings.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TtsSettingsFindFirstArgs>(args?: SelectSubset<T, TtsSettingsFindFirstArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsSettings that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsSettingsFindFirstOrThrowArgs} args - Arguments to find a TtsSettings
     * @example
     * // Get one TtsSettings
     * const ttsSettings = await prisma.ttsSettings.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TtsSettingsFindFirstOrThrowArgs>(args?: SelectSubset<T, TtsSettingsFindFirstOrThrowArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TtsSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsSettingsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TtsSettings
     * const ttsSettings = await prisma.ttsSettings.findMany()
     * 
     * // Get first 10 TtsSettings
     * const ttsSettings = await prisma.ttsSettings.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ttsSettingsWithIdOnly = await prisma.ttsSettings.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TtsSettingsFindManyArgs>(args?: SelectSubset<T, TtsSettingsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TtsSettings.
     * @param {TtsSettingsCreateArgs} args - Arguments to create a TtsSettings.
     * @example
     * // Create one TtsSettings
     * const TtsSettings = await prisma.ttsSettings.create({
     *   data: {
     *     // ... data to create a TtsSettings
     *   }
     * })
     * 
     */
    create<T extends TtsSettingsCreateArgs>(args: SelectSubset<T, TtsSettingsCreateArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TtsSettings.
     * @param {TtsSettingsCreateManyArgs} args - Arguments to create many TtsSettings.
     * @example
     * // Create many TtsSettings
     * const ttsSettings = await prisma.ttsSettings.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TtsSettingsCreateManyArgs>(args?: SelectSubset<T, TtsSettingsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TtsSettings and returns the data saved in the database.
     * @param {TtsSettingsCreateManyAndReturnArgs} args - Arguments to create many TtsSettings.
     * @example
     * // Create many TtsSettings
     * const ttsSettings = await prisma.ttsSettings.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TtsSettings and only return the `id`
     * const ttsSettingsWithIdOnly = await prisma.ttsSettings.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TtsSettingsCreateManyAndReturnArgs>(args?: SelectSubset<T, TtsSettingsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TtsSettings.
     * @param {TtsSettingsDeleteArgs} args - Arguments to delete one TtsSettings.
     * @example
     * // Delete one TtsSettings
     * const TtsSettings = await prisma.ttsSettings.delete({
     *   where: {
     *     // ... filter to delete one TtsSettings
     *   }
     * })
     * 
     */
    delete<T extends TtsSettingsDeleteArgs>(args: SelectSubset<T, TtsSettingsDeleteArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TtsSettings.
     * @param {TtsSettingsUpdateArgs} args - Arguments to update one TtsSettings.
     * @example
     * // Update one TtsSettings
     * const ttsSettings = await prisma.ttsSettings.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TtsSettingsUpdateArgs>(args: SelectSubset<T, TtsSettingsUpdateArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TtsSettings.
     * @param {TtsSettingsDeleteManyArgs} args - Arguments to filter TtsSettings to delete.
     * @example
     * // Delete a few TtsSettings
     * const { count } = await prisma.ttsSettings.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TtsSettingsDeleteManyArgs>(args?: SelectSubset<T, TtsSettingsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsSettingsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TtsSettings
     * const ttsSettings = await prisma.ttsSettings.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TtsSettingsUpdateManyArgs>(args: SelectSubset<T, TtsSettingsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsSettings and returns the data updated in the database.
     * @param {TtsSettingsUpdateManyAndReturnArgs} args - Arguments to update many TtsSettings.
     * @example
     * // Update many TtsSettings
     * const ttsSettings = await prisma.ttsSettings.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TtsSettings and only return the `id`
     * const ttsSettingsWithIdOnly = await prisma.ttsSettings.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TtsSettingsUpdateManyAndReturnArgs>(args: SelectSubset<T, TtsSettingsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TtsSettings.
     * @param {TtsSettingsUpsertArgs} args - Arguments to update or create a TtsSettings.
     * @example
     * // Update or create a TtsSettings
     * const ttsSettings = await prisma.ttsSettings.upsert({
     *   create: {
     *     // ... data to create a TtsSettings
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TtsSettings we want to update
     *   }
     * })
     */
    upsert<T extends TtsSettingsUpsertArgs>(args: SelectSubset<T, TtsSettingsUpsertArgs<ExtArgs>>): Prisma__TtsSettingsClient<$Result.GetResult<Prisma.$TtsSettingsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TtsSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsSettingsCountArgs} args - Arguments to filter TtsSettings to count.
     * @example
     * // Count the number of TtsSettings
     * const count = await prisma.ttsSettings.count({
     *   where: {
     *     // ... the filter for the TtsSettings we want to count
     *   }
     * })
    **/
    count<T extends TtsSettingsCountArgs>(
      args?: Subset<T, TtsSettingsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TtsSettingsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TtsSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsSettingsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TtsSettingsAggregateArgs>(args: Subset<T, TtsSettingsAggregateArgs>): Prisma.PrismaPromise<GetTtsSettingsAggregateType<T>>

    /**
     * Group by TtsSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsSettingsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TtsSettingsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TtsSettingsGroupByArgs['orderBy'] }
        : { orderBy?: TtsSettingsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TtsSettingsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTtsSettingsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TtsSettings model
   */
  readonly fields: TtsSettingsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TtsSettings.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TtsSettingsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TtsSettings model
   */
  interface TtsSettingsFieldRefs {
    readonly id: FieldRef<"TtsSettings", 'Int'>
    readonly rate: FieldRef<"TtsSettings", 'Float'>
    readonly volumeSound: FieldRef<"TtsSettings", 'Float'>
    readonly updatedAt: FieldRef<"TtsSettings", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TtsSettings findUnique
   */
  export type TtsSettingsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * Filter, which TtsSettings to fetch.
     */
    where: TtsSettingsWhereUniqueInput
  }

  /**
   * TtsSettings findUniqueOrThrow
   */
  export type TtsSettingsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * Filter, which TtsSettings to fetch.
     */
    where: TtsSettingsWhereUniqueInput
  }

  /**
   * TtsSettings findFirst
   */
  export type TtsSettingsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * Filter, which TtsSettings to fetch.
     */
    where?: TtsSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsSettings to fetch.
     */
    orderBy?: TtsSettingsOrderByWithRelationInput | TtsSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsSettings.
     */
    cursor?: TtsSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsSettings.
     */
    distinct?: TtsSettingsScalarFieldEnum | TtsSettingsScalarFieldEnum[]
  }

  /**
   * TtsSettings findFirstOrThrow
   */
  export type TtsSettingsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * Filter, which TtsSettings to fetch.
     */
    where?: TtsSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsSettings to fetch.
     */
    orderBy?: TtsSettingsOrderByWithRelationInput | TtsSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsSettings.
     */
    cursor?: TtsSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsSettings.
     */
    distinct?: TtsSettingsScalarFieldEnum | TtsSettingsScalarFieldEnum[]
  }

  /**
   * TtsSettings findMany
   */
  export type TtsSettingsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * Filter, which TtsSettings to fetch.
     */
    where?: TtsSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsSettings to fetch.
     */
    orderBy?: TtsSettingsOrderByWithRelationInput | TtsSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TtsSettings.
     */
    cursor?: TtsSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsSettings.
     */
    skip?: number
    distinct?: TtsSettingsScalarFieldEnum | TtsSettingsScalarFieldEnum[]
  }

  /**
   * TtsSettings create
   */
  export type TtsSettingsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * The data needed to create a TtsSettings.
     */
    data: XOR<TtsSettingsCreateInput, TtsSettingsUncheckedCreateInput>
  }

  /**
   * TtsSettings createMany
   */
  export type TtsSettingsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TtsSettings.
     */
    data: TtsSettingsCreateManyInput | TtsSettingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsSettings createManyAndReturn
   */
  export type TtsSettingsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * The data used to create many TtsSettings.
     */
    data: TtsSettingsCreateManyInput | TtsSettingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsSettings update
   */
  export type TtsSettingsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * The data needed to update a TtsSettings.
     */
    data: XOR<TtsSettingsUpdateInput, TtsSettingsUncheckedUpdateInput>
    /**
     * Choose, which TtsSettings to update.
     */
    where: TtsSettingsWhereUniqueInput
  }

  /**
   * TtsSettings updateMany
   */
  export type TtsSettingsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TtsSettings.
     */
    data: XOR<TtsSettingsUpdateManyMutationInput, TtsSettingsUncheckedUpdateManyInput>
    /**
     * Filter which TtsSettings to update
     */
    where?: TtsSettingsWhereInput
    /**
     * Limit how many TtsSettings to update.
     */
    limit?: number
  }

  /**
   * TtsSettings updateManyAndReturn
   */
  export type TtsSettingsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * The data used to update TtsSettings.
     */
    data: XOR<TtsSettingsUpdateManyMutationInput, TtsSettingsUncheckedUpdateManyInput>
    /**
     * Filter which TtsSettings to update
     */
    where?: TtsSettingsWhereInput
    /**
     * Limit how many TtsSettings to update.
     */
    limit?: number
  }

  /**
   * TtsSettings upsert
   */
  export type TtsSettingsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * The filter to search for the TtsSettings to update in case it exists.
     */
    where: TtsSettingsWhereUniqueInput
    /**
     * In case the TtsSettings found by the `where` argument doesn't exist, create a new TtsSettings with this data.
     */
    create: XOR<TtsSettingsCreateInput, TtsSettingsUncheckedCreateInput>
    /**
     * In case the TtsSettings was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TtsSettingsUpdateInput, TtsSettingsUncheckedUpdateInput>
  }

  /**
   * TtsSettings delete
   */
  export type TtsSettingsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
    /**
     * Filter which TtsSettings to delete.
     */
    where: TtsSettingsWhereUniqueInput
  }

  /**
   * TtsSettings deleteMany
   */
  export type TtsSettingsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsSettings to delete
     */
    where?: TtsSettingsWhereInput
    /**
     * Limit how many TtsSettings to delete.
     */
    limit?: number
  }

  /**
   * TtsSettings without action
   */
  export type TtsSettingsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsSettings
     */
    select?: TtsSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsSettings
     */
    omit?: TtsSettingsOmit<ExtArgs> | null
  }


  /**
   * Model TtsVoiceOverride
   */

  export type AggregateTtsVoiceOverride = {
    _count: TtsVoiceOverrideCountAggregateOutputType | null
    _avg: TtsVoiceOverrideAvgAggregateOutputType | null
    _sum: TtsVoiceOverrideSumAggregateOutputType | null
    _min: TtsVoiceOverrideMinAggregateOutputType | null
    _max: TtsVoiceOverrideMaxAggregateOutputType | null
  }

  export type TtsVoiceOverrideAvgAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
  }

  export type TtsVoiceOverrideSumAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
  }

  export type TtsVoiceOverrideMinAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
    voiceName: string | null
    updatedAt: Date | null
  }

  export type TtsVoiceOverrideMaxAggregateOutputType = {
    id: number | null
    year: number | null
    week: number | null
    voiceName: string | null
    updatedAt: Date | null
  }

  export type TtsVoiceOverrideCountAggregateOutputType = {
    id: number
    year: number
    week: number
    voiceName: number
    updatedAt: number
    _all: number
  }


  export type TtsVoiceOverrideAvgAggregateInputType = {
    id?: true
    year?: true
    week?: true
  }

  export type TtsVoiceOverrideSumAggregateInputType = {
    id?: true
    year?: true
    week?: true
  }

  export type TtsVoiceOverrideMinAggregateInputType = {
    id?: true
    year?: true
    week?: true
    voiceName?: true
    updatedAt?: true
  }

  export type TtsVoiceOverrideMaxAggregateInputType = {
    id?: true
    year?: true
    week?: true
    voiceName?: true
    updatedAt?: true
  }

  export type TtsVoiceOverrideCountAggregateInputType = {
    id?: true
    year?: true
    week?: true
    voiceName?: true
    updatedAt?: true
    _all?: true
  }

  export type TtsVoiceOverrideAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsVoiceOverride to aggregate.
     */
    where?: TtsVoiceOverrideWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceOverrides to fetch.
     */
    orderBy?: TtsVoiceOverrideOrderByWithRelationInput | TtsVoiceOverrideOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TtsVoiceOverrideWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceOverrides from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceOverrides.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TtsVoiceOverrides
    **/
    _count?: true | TtsVoiceOverrideCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TtsVoiceOverrideAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TtsVoiceOverrideSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TtsVoiceOverrideMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TtsVoiceOverrideMaxAggregateInputType
  }

  export type GetTtsVoiceOverrideAggregateType<T extends TtsVoiceOverrideAggregateArgs> = {
        [P in keyof T & keyof AggregateTtsVoiceOverride]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTtsVoiceOverride[P]>
      : GetScalarType<T[P], AggregateTtsVoiceOverride[P]>
  }




  export type TtsVoiceOverrideGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TtsVoiceOverrideWhereInput
    orderBy?: TtsVoiceOverrideOrderByWithAggregationInput | TtsVoiceOverrideOrderByWithAggregationInput[]
    by: TtsVoiceOverrideScalarFieldEnum[] | TtsVoiceOverrideScalarFieldEnum
    having?: TtsVoiceOverrideScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TtsVoiceOverrideCountAggregateInputType | true
    _avg?: TtsVoiceOverrideAvgAggregateInputType
    _sum?: TtsVoiceOverrideSumAggregateInputType
    _min?: TtsVoiceOverrideMinAggregateInputType
    _max?: TtsVoiceOverrideMaxAggregateInputType
  }

  export type TtsVoiceOverrideGroupByOutputType = {
    id: number
    year: number
    week: number
    voiceName: string
    updatedAt: Date
    _count: TtsVoiceOverrideCountAggregateOutputType | null
    _avg: TtsVoiceOverrideAvgAggregateOutputType | null
    _sum: TtsVoiceOverrideSumAggregateOutputType | null
    _min: TtsVoiceOverrideMinAggregateOutputType | null
    _max: TtsVoiceOverrideMaxAggregateOutputType | null
  }

  type GetTtsVoiceOverrideGroupByPayload<T extends TtsVoiceOverrideGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TtsVoiceOverrideGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TtsVoiceOverrideGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TtsVoiceOverrideGroupByOutputType[P]>
            : GetScalarType<T[P], TtsVoiceOverrideGroupByOutputType[P]>
        }
      >
    >


  export type TtsVoiceOverrideSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ttsVoiceOverride"]>

  export type TtsVoiceOverrideSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ttsVoiceOverride"]>

  export type TtsVoiceOverrideSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ttsVoiceOverride"]>

  export type TtsVoiceOverrideSelectScalar = {
    id?: boolean
    year?: boolean
    week?: boolean
    voiceName?: boolean
    updatedAt?: boolean
  }

  export type TtsVoiceOverrideOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "year" | "week" | "voiceName" | "updatedAt", ExtArgs["result"]["ttsVoiceOverride"]>

  export type $TtsVoiceOverridePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TtsVoiceOverride"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      year: number
      week: number
      voiceName: string
      updatedAt: Date
    }, ExtArgs["result"]["ttsVoiceOverride"]>
    composites: {}
  }

  type TtsVoiceOverrideGetPayload<S extends boolean | null | undefined | TtsVoiceOverrideDefaultArgs> = $Result.GetResult<Prisma.$TtsVoiceOverridePayload, S>

  type TtsVoiceOverrideCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TtsVoiceOverrideFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TtsVoiceOverrideCountAggregateInputType | true
    }

  export interface TtsVoiceOverrideDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TtsVoiceOverride'], meta: { name: 'TtsVoiceOverride' } }
    /**
     * Find zero or one TtsVoiceOverride that matches the filter.
     * @param {TtsVoiceOverrideFindUniqueArgs} args - Arguments to find a TtsVoiceOverride
     * @example
     * // Get one TtsVoiceOverride
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TtsVoiceOverrideFindUniqueArgs>(args: SelectSubset<T, TtsVoiceOverrideFindUniqueArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TtsVoiceOverride that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TtsVoiceOverrideFindUniqueOrThrowArgs} args - Arguments to find a TtsVoiceOverride
     * @example
     * // Get one TtsVoiceOverride
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TtsVoiceOverrideFindUniqueOrThrowArgs>(args: SelectSubset<T, TtsVoiceOverrideFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsVoiceOverride that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceOverrideFindFirstArgs} args - Arguments to find a TtsVoiceOverride
     * @example
     * // Get one TtsVoiceOverride
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TtsVoiceOverrideFindFirstArgs>(args?: SelectSubset<T, TtsVoiceOverrideFindFirstArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsVoiceOverride that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceOverrideFindFirstOrThrowArgs} args - Arguments to find a TtsVoiceOverride
     * @example
     * // Get one TtsVoiceOverride
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TtsVoiceOverrideFindFirstOrThrowArgs>(args?: SelectSubset<T, TtsVoiceOverrideFindFirstOrThrowArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TtsVoiceOverrides that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceOverrideFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TtsVoiceOverrides
     * const ttsVoiceOverrides = await prisma.ttsVoiceOverride.findMany()
     * 
     * // Get first 10 TtsVoiceOverrides
     * const ttsVoiceOverrides = await prisma.ttsVoiceOverride.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ttsVoiceOverrideWithIdOnly = await prisma.ttsVoiceOverride.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TtsVoiceOverrideFindManyArgs>(args?: SelectSubset<T, TtsVoiceOverrideFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TtsVoiceOverride.
     * @param {TtsVoiceOverrideCreateArgs} args - Arguments to create a TtsVoiceOverride.
     * @example
     * // Create one TtsVoiceOverride
     * const TtsVoiceOverride = await prisma.ttsVoiceOverride.create({
     *   data: {
     *     // ... data to create a TtsVoiceOverride
     *   }
     * })
     * 
     */
    create<T extends TtsVoiceOverrideCreateArgs>(args: SelectSubset<T, TtsVoiceOverrideCreateArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TtsVoiceOverrides.
     * @param {TtsVoiceOverrideCreateManyArgs} args - Arguments to create many TtsVoiceOverrides.
     * @example
     * // Create many TtsVoiceOverrides
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TtsVoiceOverrideCreateManyArgs>(args?: SelectSubset<T, TtsVoiceOverrideCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TtsVoiceOverrides and returns the data saved in the database.
     * @param {TtsVoiceOverrideCreateManyAndReturnArgs} args - Arguments to create many TtsVoiceOverrides.
     * @example
     * // Create many TtsVoiceOverrides
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TtsVoiceOverrides and only return the `id`
     * const ttsVoiceOverrideWithIdOnly = await prisma.ttsVoiceOverride.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TtsVoiceOverrideCreateManyAndReturnArgs>(args?: SelectSubset<T, TtsVoiceOverrideCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TtsVoiceOverride.
     * @param {TtsVoiceOverrideDeleteArgs} args - Arguments to delete one TtsVoiceOverride.
     * @example
     * // Delete one TtsVoiceOverride
     * const TtsVoiceOverride = await prisma.ttsVoiceOverride.delete({
     *   where: {
     *     // ... filter to delete one TtsVoiceOverride
     *   }
     * })
     * 
     */
    delete<T extends TtsVoiceOverrideDeleteArgs>(args: SelectSubset<T, TtsVoiceOverrideDeleteArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TtsVoiceOverride.
     * @param {TtsVoiceOverrideUpdateArgs} args - Arguments to update one TtsVoiceOverride.
     * @example
     * // Update one TtsVoiceOverride
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TtsVoiceOverrideUpdateArgs>(args: SelectSubset<T, TtsVoiceOverrideUpdateArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TtsVoiceOverrides.
     * @param {TtsVoiceOverrideDeleteManyArgs} args - Arguments to filter TtsVoiceOverrides to delete.
     * @example
     * // Delete a few TtsVoiceOverrides
     * const { count } = await prisma.ttsVoiceOverride.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TtsVoiceOverrideDeleteManyArgs>(args?: SelectSubset<T, TtsVoiceOverrideDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsVoiceOverrides.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceOverrideUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TtsVoiceOverrides
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TtsVoiceOverrideUpdateManyArgs>(args: SelectSubset<T, TtsVoiceOverrideUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsVoiceOverrides and returns the data updated in the database.
     * @param {TtsVoiceOverrideUpdateManyAndReturnArgs} args - Arguments to update many TtsVoiceOverrides.
     * @example
     * // Update many TtsVoiceOverrides
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TtsVoiceOverrides and only return the `id`
     * const ttsVoiceOverrideWithIdOnly = await prisma.ttsVoiceOverride.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TtsVoiceOverrideUpdateManyAndReturnArgs>(args: SelectSubset<T, TtsVoiceOverrideUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TtsVoiceOverride.
     * @param {TtsVoiceOverrideUpsertArgs} args - Arguments to update or create a TtsVoiceOverride.
     * @example
     * // Update or create a TtsVoiceOverride
     * const ttsVoiceOverride = await prisma.ttsVoiceOverride.upsert({
     *   create: {
     *     // ... data to create a TtsVoiceOverride
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TtsVoiceOverride we want to update
     *   }
     * })
     */
    upsert<T extends TtsVoiceOverrideUpsertArgs>(args: SelectSubset<T, TtsVoiceOverrideUpsertArgs<ExtArgs>>): Prisma__TtsVoiceOverrideClient<$Result.GetResult<Prisma.$TtsVoiceOverridePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TtsVoiceOverrides.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceOverrideCountArgs} args - Arguments to filter TtsVoiceOverrides to count.
     * @example
     * // Count the number of TtsVoiceOverrides
     * const count = await prisma.ttsVoiceOverride.count({
     *   where: {
     *     // ... the filter for the TtsVoiceOverrides we want to count
     *   }
     * })
    **/
    count<T extends TtsVoiceOverrideCountArgs>(
      args?: Subset<T, TtsVoiceOverrideCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TtsVoiceOverrideCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TtsVoiceOverride.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceOverrideAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TtsVoiceOverrideAggregateArgs>(args: Subset<T, TtsVoiceOverrideAggregateArgs>): Prisma.PrismaPromise<GetTtsVoiceOverrideAggregateType<T>>

    /**
     * Group by TtsVoiceOverride.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceOverrideGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TtsVoiceOverrideGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TtsVoiceOverrideGroupByArgs['orderBy'] }
        : { orderBy?: TtsVoiceOverrideGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TtsVoiceOverrideGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTtsVoiceOverrideGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TtsVoiceOverride model
   */
  readonly fields: TtsVoiceOverrideFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TtsVoiceOverride.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TtsVoiceOverrideClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TtsVoiceOverride model
   */
  interface TtsVoiceOverrideFieldRefs {
    readonly id: FieldRef<"TtsVoiceOverride", 'Int'>
    readonly year: FieldRef<"TtsVoiceOverride", 'Int'>
    readonly week: FieldRef<"TtsVoiceOverride", 'Int'>
    readonly voiceName: FieldRef<"TtsVoiceOverride", 'String'>
    readonly updatedAt: FieldRef<"TtsVoiceOverride", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TtsVoiceOverride findUnique
   */
  export type TtsVoiceOverrideFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceOverride to fetch.
     */
    where: TtsVoiceOverrideWhereUniqueInput
  }

  /**
   * TtsVoiceOverride findUniqueOrThrow
   */
  export type TtsVoiceOverrideFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceOverride to fetch.
     */
    where: TtsVoiceOverrideWhereUniqueInput
  }

  /**
   * TtsVoiceOverride findFirst
   */
  export type TtsVoiceOverrideFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceOverride to fetch.
     */
    where?: TtsVoiceOverrideWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceOverrides to fetch.
     */
    orderBy?: TtsVoiceOverrideOrderByWithRelationInput | TtsVoiceOverrideOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsVoiceOverrides.
     */
    cursor?: TtsVoiceOverrideWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceOverrides from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceOverrides.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsVoiceOverrides.
     */
    distinct?: TtsVoiceOverrideScalarFieldEnum | TtsVoiceOverrideScalarFieldEnum[]
  }

  /**
   * TtsVoiceOverride findFirstOrThrow
   */
  export type TtsVoiceOverrideFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceOverride to fetch.
     */
    where?: TtsVoiceOverrideWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceOverrides to fetch.
     */
    orderBy?: TtsVoiceOverrideOrderByWithRelationInput | TtsVoiceOverrideOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsVoiceOverrides.
     */
    cursor?: TtsVoiceOverrideWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceOverrides from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceOverrides.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsVoiceOverrides.
     */
    distinct?: TtsVoiceOverrideScalarFieldEnum | TtsVoiceOverrideScalarFieldEnum[]
  }

  /**
   * TtsVoiceOverride findMany
   */
  export type TtsVoiceOverrideFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceOverrides to fetch.
     */
    where?: TtsVoiceOverrideWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceOverrides to fetch.
     */
    orderBy?: TtsVoiceOverrideOrderByWithRelationInput | TtsVoiceOverrideOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TtsVoiceOverrides.
     */
    cursor?: TtsVoiceOverrideWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceOverrides from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceOverrides.
     */
    skip?: number
    distinct?: TtsVoiceOverrideScalarFieldEnum | TtsVoiceOverrideScalarFieldEnum[]
  }

  /**
   * TtsVoiceOverride create
   */
  export type TtsVoiceOverrideCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * The data needed to create a TtsVoiceOverride.
     */
    data: XOR<TtsVoiceOverrideCreateInput, TtsVoiceOverrideUncheckedCreateInput>
  }

  /**
   * TtsVoiceOverride createMany
   */
  export type TtsVoiceOverrideCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TtsVoiceOverrides.
     */
    data: TtsVoiceOverrideCreateManyInput | TtsVoiceOverrideCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsVoiceOverride createManyAndReturn
   */
  export type TtsVoiceOverrideCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * The data used to create many TtsVoiceOverrides.
     */
    data: TtsVoiceOverrideCreateManyInput | TtsVoiceOverrideCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsVoiceOverride update
   */
  export type TtsVoiceOverrideUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * The data needed to update a TtsVoiceOverride.
     */
    data: XOR<TtsVoiceOverrideUpdateInput, TtsVoiceOverrideUncheckedUpdateInput>
    /**
     * Choose, which TtsVoiceOverride to update.
     */
    where: TtsVoiceOverrideWhereUniqueInput
  }

  /**
   * TtsVoiceOverride updateMany
   */
  export type TtsVoiceOverrideUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TtsVoiceOverrides.
     */
    data: XOR<TtsVoiceOverrideUpdateManyMutationInput, TtsVoiceOverrideUncheckedUpdateManyInput>
    /**
     * Filter which TtsVoiceOverrides to update
     */
    where?: TtsVoiceOverrideWhereInput
    /**
     * Limit how many TtsVoiceOverrides to update.
     */
    limit?: number
  }

  /**
   * TtsVoiceOverride updateManyAndReturn
   */
  export type TtsVoiceOverrideUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * The data used to update TtsVoiceOverrides.
     */
    data: XOR<TtsVoiceOverrideUpdateManyMutationInput, TtsVoiceOverrideUncheckedUpdateManyInput>
    /**
     * Filter which TtsVoiceOverrides to update
     */
    where?: TtsVoiceOverrideWhereInput
    /**
     * Limit how many TtsVoiceOverrides to update.
     */
    limit?: number
  }

  /**
   * TtsVoiceOverride upsert
   */
  export type TtsVoiceOverrideUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * The filter to search for the TtsVoiceOverride to update in case it exists.
     */
    where: TtsVoiceOverrideWhereUniqueInput
    /**
     * In case the TtsVoiceOverride found by the `where` argument doesn't exist, create a new TtsVoiceOverride with this data.
     */
    create: XOR<TtsVoiceOverrideCreateInput, TtsVoiceOverrideUncheckedCreateInput>
    /**
     * In case the TtsVoiceOverride was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TtsVoiceOverrideUpdateInput, TtsVoiceOverrideUncheckedUpdateInput>
  }

  /**
   * TtsVoiceOverride delete
   */
  export type TtsVoiceOverrideDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
    /**
     * Filter which TtsVoiceOverride to delete.
     */
    where: TtsVoiceOverrideWhereUniqueInput
  }

  /**
   * TtsVoiceOverride deleteMany
   */
  export type TtsVoiceOverrideDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsVoiceOverrides to delete
     */
    where?: TtsVoiceOverrideWhereInput
    /**
     * Limit how many TtsVoiceOverrides to delete.
     */
    limit?: number
  }

  /**
   * TtsVoiceOverride without action
   */
  export type TtsVoiceOverrideDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceOverride
     */
    select?: TtsVoiceOverrideSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceOverride
     */
    omit?: TtsVoiceOverrideOmit<ExtArgs> | null
  }


  /**
   * Model NameDictionary
   */

  export type AggregateNameDictionary = {
    _count: NameDictionaryCountAggregateOutputType | null
    _avg: NameDictionaryAvgAggregateOutputType | null
    _sum: NameDictionarySumAggregateOutputType | null
    _min: NameDictionaryMinAggregateOutputType | null
    _max: NameDictionaryMaxAggregateOutputType | null
  }

  export type NameDictionaryAvgAggregateOutputType = {
    id: number | null
  }

  export type NameDictionarySumAggregateOutputType = {
    id: number | null
  }

  export type NameDictionaryMinAggregateOutputType = {
    id: number | null
    key: string | null
    value: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type NameDictionaryMaxAggregateOutputType = {
    id: number | null
    key: string | null
    value: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type NameDictionaryCountAggregateOutputType = {
    id: number
    key: number
    value: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type NameDictionaryAvgAggregateInputType = {
    id?: true
  }

  export type NameDictionarySumAggregateInputType = {
    id?: true
  }

  export type NameDictionaryMinAggregateInputType = {
    id?: true
    key?: true
    value?: true
    createdAt?: true
    updatedAt?: true
  }

  export type NameDictionaryMaxAggregateInputType = {
    id?: true
    key?: true
    value?: true
    createdAt?: true
    updatedAt?: true
  }

  export type NameDictionaryCountAggregateInputType = {
    id?: true
    key?: true
    value?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type NameDictionaryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which NameDictionary to aggregate.
     */
    where?: NameDictionaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NameDictionaries to fetch.
     */
    orderBy?: NameDictionaryOrderByWithRelationInput | NameDictionaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: NameDictionaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NameDictionaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NameDictionaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned NameDictionaries
    **/
    _count?: true | NameDictionaryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: NameDictionaryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: NameDictionarySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: NameDictionaryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: NameDictionaryMaxAggregateInputType
  }

  export type GetNameDictionaryAggregateType<T extends NameDictionaryAggregateArgs> = {
        [P in keyof T & keyof AggregateNameDictionary]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNameDictionary[P]>
      : GetScalarType<T[P], AggregateNameDictionary[P]>
  }




  export type NameDictionaryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: NameDictionaryWhereInput
    orderBy?: NameDictionaryOrderByWithAggregationInput | NameDictionaryOrderByWithAggregationInput[]
    by: NameDictionaryScalarFieldEnum[] | NameDictionaryScalarFieldEnum
    having?: NameDictionaryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: NameDictionaryCountAggregateInputType | true
    _avg?: NameDictionaryAvgAggregateInputType
    _sum?: NameDictionarySumAggregateInputType
    _min?: NameDictionaryMinAggregateInputType
    _max?: NameDictionaryMaxAggregateInputType
  }

  export type NameDictionaryGroupByOutputType = {
    id: number
    key: string
    value: string
    createdAt: Date
    updatedAt: Date
    _count: NameDictionaryCountAggregateOutputType | null
    _avg: NameDictionaryAvgAggregateOutputType | null
    _sum: NameDictionarySumAggregateOutputType | null
    _min: NameDictionaryMinAggregateOutputType | null
    _max: NameDictionaryMaxAggregateOutputType | null
  }

  type GetNameDictionaryGroupByPayload<T extends NameDictionaryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<NameDictionaryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof NameDictionaryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], NameDictionaryGroupByOutputType[P]>
            : GetScalarType<T[P], NameDictionaryGroupByOutputType[P]>
        }
      >
    >


  export type NameDictionarySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["nameDictionary"]>

  export type NameDictionarySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["nameDictionary"]>

  export type NameDictionarySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["nameDictionary"]>

  export type NameDictionarySelectScalar = {
    id?: boolean
    key?: boolean
    value?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type NameDictionaryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "key" | "value" | "createdAt" | "updatedAt", ExtArgs["result"]["nameDictionary"]>

  export type $NameDictionaryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "NameDictionary"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      key: string
      value: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["nameDictionary"]>
    composites: {}
  }

  type NameDictionaryGetPayload<S extends boolean | null | undefined | NameDictionaryDefaultArgs> = $Result.GetResult<Prisma.$NameDictionaryPayload, S>

  type NameDictionaryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<NameDictionaryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: NameDictionaryCountAggregateInputType | true
    }

  export interface NameDictionaryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['NameDictionary'], meta: { name: 'NameDictionary' } }
    /**
     * Find zero or one NameDictionary that matches the filter.
     * @param {NameDictionaryFindUniqueArgs} args - Arguments to find a NameDictionary
     * @example
     * // Get one NameDictionary
     * const nameDictionary = await prisma.nameDictionary.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends NameDictionaryFindUniqueArgs>(args: SelectSubset<T, NameDictionaryFindUniqueArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one NameDictionary that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {NameDictionaryFindUniqueOrThrowArgs} args - Arguments to find a NameDictionary
     * @example
     * // Get one NameDictionary
     * const nameDictionary = await prisma.nameDictionary.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends NameDictionaryFindUniqueOrThrowArgs>(args: SelectSubset<T, NameDictionaryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first NameDictionary that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NameDictionaryFindFirstArgs} args - Arguments to find a NameDictionary
     * @example
     * // Get one NameDictionary
     * const nameDictionary = await prisma.nameDictionary.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends NameDictionaryFindFirstArgs>(args?: SelectSubset<T, NameDictionaryFindFirstArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first NameDictionary that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NameDictionaryFindFirstOrThrowArgs} args - Arguments to find a NameDictionary
     * @example
     * // Get one NameDictionary
     * const nameDictionary = await prisma.nameDictionary.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends NameDictionaryFindFirstOrThrowArgs>(args?: SelectSubset<T, NameDictionaryFindFirstOrThrowArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more NameDictionaries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NameDictionaryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all NameDictionaries
     * const nameDictionaries = await prisma.nameDictionary.findMany()
     * 
     * // Get first 10 NameDictionaries
     * const nameDictionaries = await prisma.nameDictionary.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nameDictionaryWithIdOnly = await prisma.nameDictionary.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends NameDictionaryFindManyArgs>(args?: SelectSubset<T, NameDictionaryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a NameDictionary.
     * @param {NameDictionaryCreateArgs} args - Arguments to create a NameDictionary.
     * @example
     * // Create one NameDictionary
     * const NameDictionary = await prisma.nameDictionary.create({
     *   data: {
     *     // ... data to create a NameDictionary
     *   }
     * })
     * 
     */
    create<T extends NameDictionaryCreateArgs>(args: SelectSubset<T, NameDictionaryCreateArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many NameDictionaries.
     * @param {NameDictionaryCreateManyArgs} args - Arguments to create many NameDictionaries.
     * @example
     * // Create many NameDictionaries
     * const nameDictionary = await prisma.nameDictionary.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends NameDictionaryCreateManyArgs>(args?: SelectSubset<T, NameDictionaryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many NameDictionaries and returns the data saved in the database.
     * @param {NameDictionaryCreateManyAndReturnArgs} args - Arguments to create many NameDictionaries.
     * @example
     * // Create many NameDictionaries
     * const nameDictionary = await prisma.nameDictionary.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many NameDictionaries and only return the `id`
     * const nameDictionaryWithIdOnly = await prisma.nameDictionary.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends NameDictionaryCreateManyAndReturnArgs>(args?: SelectSubset<T, NameDictionaryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a NameDictionary.
     * @param {NameDictionaryDeleteArgs} args - Arguments to delete one NameDictionary.
     * @example
     * // Delete one NameDictionary
     * const NameDictionary = await prisma.nameDictionary.delete({
     *   where: {
     *     // ... filter to delete one NameDictionary
     *   }
     * })
     * 
     */
    delete<T extends NameDictionaryDeleteArgs>(args: SelectSubset<T, NameDictionaryDeleteArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one NameDictionary.
     * @param {NameDictionaryUpdateArgs} args - Arguments to update one NameDictionary.
     * @example
     * // Update one NameDictionary
     * const nameDictionary = await prisma.nameDictionary.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends NameDictionaryUpdateArgs>(args: SelectSubset<T, NameDictionaryUpdateArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more NameDictionaries.
     * @param {NameDictionaryDeleteManyArgs} args - Arguments to filter NameDictionaries to delete.
     * @example
     * // Delete a few NameDictionaries
     * const { count } = await prisma.nameDictionary.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends NameDictionaryDeleteManyArgs>(args?: SelectSubset<T, NameDictionaryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more NameDictionaries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NameDictionaryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many NameDictionaries
     * const nameDictionary = await prisma.nameDictionary.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends NameDictionaryUpdateManyArgs>(args: SelectSubset<T, NameDictionaryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more NameDictionaries and returns the data updated in the database.
     * @param {NameDictionaryUpdateManyAndReturnArgs} args - Arguments to update many NameDictionaries.
     * @example
     * // Update many NameDictionaries
     * const nameDictionary = await prisma.nameDictionary.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more NameDictionaries and only return the `id`
     * const nameDictionaryWithIdOnly = await prisma.nameDictionary.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends NameDictionaryUpdateManyAndReturnArgs>(args: SelectSubset<T, NameDictionaryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one NameDictionary.
     * @param {NameDictionaryUpsertArgs} args - Arguments to update or create a NameDictionary.
     * @example
     * // Update or create a NameDictionary
     * const nameDictionary = await prisma.nameDictionary.upsert({
     *   create: {
     *     // ... data to create a NameDictionary
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the NameDictionary we want to update
     *   }
     * })
     */
    upsert<T extends NameDictionaryUpsertArgs>(args: SelectSubset<T, NameDictionaryUpsertArgs<ExtArgs>>): Prisma__NameDictionaryClient<$Result.GetResult<Prisma.$NameDictionaryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of NameDictionaries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NameDictionaryCountArgs} args - Arguments to filter NameDictionaries to count.
     * @example
     * // Count the number of NameDictionaries
     * const count = await prisma.nameDictionary.count({
     *   where: {
     *     // ... the filter for the NameDictionaries we want to count
     *   }
     * })
    **/
    count<T extends NameDictionaryCountArgs>(
      args?: Subset<T, NameDictionaryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], NameDictionaryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a NameDictionary.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NameDictionaryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends NameDictionaryAggregateArgs>(args: Subset<T, NameDictionaryAggregateArgs>): Prisma.PrismaPromise<GetNameDictionaryAggregateType<T>>

    /**
     * Group by NameDictionary.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NameDictionaryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends NameDictionaryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: NameDictionaryGroupByArgs['orderBy'] }
        : { orderBy?: NameDictionaryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, NameDictionaryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNameDictionaryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the NameDictionary model
   */
  readonly fields: NameDictionaryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for NameDictionary.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__NameDictionaryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the NameDictionary model
   */
  interface NameDictionaryFieldRefs {
    readonly id: FieldRef<"NameDictionary", 'Int'>
    readonly key: FieldRef<"NameDictionary", 'String'>
    readonly value: FieldRef<"NameDictionary", 'String'>
    readonly createdAt: FieldRef<"NameDictionary", 'DateTime'>
    readonly updatedAt: FieldRef<"NameDictionary", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * NameDictionary findUnique
   */
  export type NameDictionaryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * Filter, which NameDictionary to fetch.
     */
    where: NameDictionaryWhereUniqueInput
  }

  /**
   * NameDictionary findUniqueOrThrow
   */
  export type NameDictionaryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * Filter, which NameDictionary to fetch.
     */
    where: NameDictionaryWhereUniqueInput
  }

  /**
   * NameDictionary findFirst
   */
  export type NameDictionaryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * Filter, which NameDictionary to fetch.
     */
    where?: NameDictionaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NameDictionaries to fetch.
     */
    orderBy?: NameDictionaryOrderByWithRelationInput | NameDictionaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for NameDictionaries.
     */
    cursor?: NameDictionaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NameDictionaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NameDictionaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of NameDictionaries.
     */
    distinct?: NameDictionaryScalarFieldEnum | NameDictionaryScalarFieldEnum[]
  }

  /**
   * NameDictionary findFirstOrThrow
   */
  export type NameDictionaryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * Filter, which NameDictionary to fetch.
     */
    where?: NameDictionaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NameDictionaries to fetch.
     */
    orderBy?: NameDictionaryOrderByWithRelationInput | NameDictionaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for NameDictionaries.
     */
    cursor?: NameDictionaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NameDictionaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NameDictionaries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of NameDictionaries.
     */
    distinct?: NameDictionaryScalarFieldEnum | NameDictionaryScalarFieldEnum[]
  }

  /**
   * NameDictionary findMany
   */
  export type NameDictionaryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * Filter, which NameDictionaries to fetch.
     */
    where?: NameDictionaryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NameDictionaries to fetch.
     */
    orderBy?: NameDictionaryOrderByWithRelationInput | NameDictionaryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing NameDictionaries.
     */
    cursor?: NameDictionaryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NameDictionaries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NameDictionaries.
     */
    skip?: number
    distinct?: NameDictionaryScalarFieldEnum | NameDictionaryScalarFieldEnum[]
  }

  /**
   * NameDictionary create
   */
  export type NameDictionaryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * The data needed to create a NameDictionary.
     */
    data: XOR<NameDictionaryCreateInput, NameDictionaryUncheckedCreateInput>
  }

  /**
   * NameDictionary createMany
   */
  export type NameDictionaryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many NameDictionaries.
     */
    data: NameDictionaryCreateManyInput | NameDictionaryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * NameDictionary createManyAndReturn
   */
  export type NameDictionaryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * The data used to create many NameDictionaries.
     */
    data: NameDictionaryCreateManyInput | NameDictionaryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * NameDictionary update
   */
  export type NameDictionaryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * The data needed to update a NameDictionary.
     */
    data: XOR<NameDictionaryUpdateInput, NameDictionaryUncheckedUpdateInput>
    /**
     * Choose, which NameDictionary to update.
     */
    where: NameDictionaryWhereUniqueInput
  }

  /**
   * NameDictionary updateMany
   */
  export type NameDictionaryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update NameDictionaries.
     */
    data: XOR<NameDictionaryUpdateManyMutationInput, NameDictionaryUncheckedUpdateManyInput>
    /**
     * Filter which NameDictionaries to update
     */
    where?: NameDictionaryWhereInput
    /**
     * Limit how many NameDictionaries to update.
     */
    limit?: number
  }

  /**
   * NameDictionary updateManyAndReturn
   */
  export type NameDictionaryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * The data used to update NameDictionaries.
     */
    data: XOR<NameDictionaryUpdateManyMutationInput, NameDictionaryUncheckedUpdateManyInput>
    /**
     * Filter which NameDictionaries to update
     */
    where?: NameDictionaryWhereInput
    /**
     * Limit how many NameDictionaries to update.
     */
    limit?: number
  }

  /**
   * NameDictionary upsert
   */
  export type NameDictionaryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * The filter to search for the NameDictionary to update in case it exists.
     */
    where: NameDictionaryWhereUniqueInput
    /**
     * In case the NameDictionary found by the `where` argument doesn't exist, create a new NameDictionary with this data.
     */
    create: XOR<NameDictionaryCreateInput, NameDictionaryUncheckedCreateInput>
    /**
     * In case the NameDictionary was found with the provided `where` argument, update it with this data.
     */
    update: XOR<NameDictionaryUpdateInput, NameDictionaryUncheckedUpdateInput>
  }

  /**
   * NameDictionary delete
   */
  export type NameDictionaryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
    /**
     * Filter which NameDictionary to delete.
     */
    where: NameDictionaryWhereUniqueInput
  }

  /**
   * NameDictionary deleteMany
   */
  export type NameDictionaryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which NameDictionaries to delete
     */
    where?: NameDictionaryWhereInput
    /**
     * Limit how many NameDictionaries to delete.
     */
    limit?: number
  }

  /**
   * NameDictionary without action
   */
  export type NameDictionaryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NameDictionary
     */
    select?: NameDictionarySelect<ExtArgs> | null
    /**
     * Omit specific fields from the NameDictionary
     */
    omit?: NameDictionaryOmit<ExtArgs> | null
  }


  /**
   * Model TtsVoiceTest
   */

  export type AggregateTtsVoiceTest = {
    _count: TtsVoiceTestCountAggregateOutputType | null
    _avg: TtsVoiceTestAvgAggregateOutputType | null
    _sum: TtsVoiceTestSumAggregateOutputType | null
    _min: TtsVoiceTestMinAggregateOutputType | null
    _max: TtsVoiceTestMaxAggregateOutputType | null
  }

  export type TtsVoiceTestAvgAggregateOutputType = {
    id: number | null
    rate: number | null
    volumeSound: number | null
  }

  export type TtsVoiceTestSumAggregateOutputType = {
    id: number | null
    rate: number | null
    volumeSound: number | null
  }

  export type TtsVoiceTestMinAggregateOutputType = {
    id: number | null
    cacheKey: string | null
    voiceName: string | null
    rate: number | null
    text: string | null
    audioMp3: Bytes | null
    volumeSound: number | null
    createdAt: Date | null
  }

  export type TtsVoiceTestMaxAggregateOutputType = {
    id: number | null
    cacheKey: string | null
    voiceName: string | null
    rate: number | null
    text: string | null
    audioMp3: Bytes | null
    volumeSound: number | null
    createdAt: Date | null
  }

  export type TtsVoiceTestCountAggregateOutputType = {
    id: number
    cacheKey: number
    voiceName: number
    rate: number
    text: number
    audioMp3: number
    volumeSound: number
    createdAt: number
    _all: number
  }


  export type TtsVoiceTestAvgAggregateInputType = {
    id?: true
    rate?: true
    volumeSound?: true
  }

  export type TtsVoiceTestSumAggregateInputType = {
    id?: true
    rate?: true
    volumeSound?: true
  }

  export type TtsVoiceTestMinAggregateInputType = {
    id?: true
    cacheKey?: true
    voiceName?: true
    rate?: true
    text?: true
    audioMp3?: true
    volumeSound?: true
    createdAt?: true
  }

  export type TtsVoiceTestMaxAggregateInputType = {
    id?: true
    cacheKey?: true
    voiceName?: true
    rate?: true
    text?: true
    audioMp3?: true
    volumeSound?: true
    createdAt?: true
  }

  export type TtsVoiceTestCountAggregateInputType = {
    id?: true
    cacheKey?: true
    voiceName?: true
    rate?: true
    text?: true
    audioMp3?: true
    volumeSound?: true
    createdAt?: true
    _all?: true
  }

  export type TtsVoiceTestAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsVoiceTest to aggregate.
     */
    where?: TtsVoiceTestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceTests to fetch.
     */
    orderBy?: TtsVoiceTestOrderByWithRelationInput | TtsVoiceTestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TtsVoiceTestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceTests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceTests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TtsVoiceTests
    **/
    _count?: true | TtsVoiceTestCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TtsVoiceTestAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TtsVoiceTestSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TtsVoiceTestMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TtsVoiceTestMaxAggregateInputType
  }

  export type GetTtsVoiceTestAggregateType<T extends TtsVoiceTestAggregateArgs> = {
        [P in keyof T & keyof AggregateTtsVoiceTest]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTtsVoiceTest[P]>
      : GetScalarType<T[P], AggregateTtsVoiceTest[P]>
  }




  export type TtsVoiceTestGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TtsVoiceTestWhereInput
    orderBy?: TtsVoiceTestOrderByWithAggregationInput | TtsVoiceTestOrderByWithAggregationInput[]
    by: TtsVoiceTestScalarFieldEnum[] | TtsVoiceTestScalarFieldEnum
    having?: TtsVoiceTestScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TtsVoiceTestCountAggregateInputType | true
    _avg?: TtsVoiceTestAvgAggregateInputType
    _sum?: TtsVoiceTestSumAggregateInputType
    _min?: TtsVoiceTestMinAggregateInputType
    _max?: TtsVoiceTestMaxAggregateInputType
  }

  export type TtsVoiceTestGroupByOutputType = {
    id: number
    cacheKey: string
    voiceName: string
    rate: number
    text: string
    audioMp3: Bytes
    volumeSound: number
    createdAt: Date
    _count: TtsVoiceTestCountAggregateOutputType | null
    _avg: TtsVoiceTestAvgAggregateOutputType | null
    _sum: TtsVoiceTestSumAggregateOutputType | null
    _min: TtsVoiceTestMinAggregateOutputType | null
    _max: TtsVoiceTestMaxAggregateOutputType | null
  }

  type GetTtsVoiceTestGroupByPayload<T extends TtsVoiceTestGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TtsVoiceTestGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TtsVoiceTestGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TtsVoiceTestGroupByOutputType[P]>
            : GetScalarType<T[P], TtsVoiceTestGroupByOutputType[P]>
        }
      >
    >


  export type TtsVoiceTestSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cacheKey?: boolean
    voiceName?: boolean
    rate?: boolean
    text?: boolean
    audioMp3?: boolean
    volumeSound?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsVoiceTest"]>

  export type TtsVoiceTestSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cacheKey?: boolean
    voiceName?: boolean
    rate?: boolean
    text?: boolean
    audioMp3?: boolean
    volumeSound?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsVoiceTest"]>

  export type TtsVoiceTestSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cacheKey?: boolean
    voiceName?: boolean
    rate?: boolean
    text?: boolean
    audioMp3?: boolean
    volumeSound?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsVoiceTest"]>

  export type TtsVoiceTestSelectScalar = {
    id?: boolean
    cacheKey?: boolean
    voiceName?: boolean
    rate?: boolean
    text?: boolean
    audioMp3?: boolean
    volumeSound?: boolean
    createdAt?: boolean
  }

  export type TtsVoiceTestOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "cacheKey" | "voiceName" | "rate" | "text" | "audioMp3" | "volumeSound" | "createdAt", ExtArgs["result"]["ttsVoiceTest"]>

  export type $TtsVoiceTestPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TtsVoiceTest"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      cacheKey: string
      voiceName: string
      rate: number
      text: string
      audioMp3: Prisma.Bytes
      volumeSound: number
      createdAt: Date
    }, ExtArgs["result"]["ttsVoiceTest"]>
    composites: {}
  }

  type TtsVoiceTestGetPayload<S extends boolean | null | undefined | TtsVoiceTestDefaultArgs> = $Result.GetResult<Prisma.$TtsVoiceTestPayload, S>

  type TtsVoiceTestCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TtsVoiceTestFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TtsVoiceTestCountAggregateInputType | true
    }

  export interface TtsVoiceTestDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TtsVoiceTest'], meta: { name: 'TtsVoiceTest' } }
    /**
     * Find zero or one TtsVoiceTest that matches the filter.
     * @param {TtsVoiceTestFindUniqueArgs} args - Arguments to find a TtsVoiceTest
     * @example
     * // Get one TtsVoiceTest
     * const ttsVoiceTest = await prisma.ttsVoiceTest.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TtsVoiceTestFindUniqueArgs>(args: SelectSubset<T, TtsVoiceTestFindUniqueArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TtsVoiceTest that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TtsVoiceTestFindUniqueOrThrowArgs} args - Arguments to find a TtsVoiceTest
     * @example
     * // Get one TtsVoiceTest
     * const ttsVoiceTest = await prisma.ttsVoiceTest.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TtsVoiceTestFindUniqueOrThrowArgs>(args: SelectSubset<T, TtsVoiceTestFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsVoiceTest that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceTestFindFirstArgs} args - Arguments to find a TtsVoiceTest
     * @example
     * // Get one TtsVoiceTest
     * const ttsVoiceTest = await prisma.ttsVoiceTest.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TtsVoiceTestFindFirstArgs>(args?: SelectSubset<T, TtsVoiceTestFindFirstArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsVoiceTest that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceTestFindFirstOrThrowArgs} args - Arguments to find a TtsVoiceTest
     * @example
     * // Get one TtsVoiceTest
     * const ttsVoiceTest = await prisma.ttsVoiceTest.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TtsVoiceTestFindFirstOrThrowArgs>(args?: SelectSubset<T, TtsVoiceTestFindFirstOrThrowArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TtsVoiceTests that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceTestFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TtsVoiceTests
     * const ttsVoiceTests = await prisma.ttsVoiceTest.findMany()
     * 
     * // Get first 10 TtsVoiceTests
     * const ttsVoiceTests = await prisma.ttsVoiceTest.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ttsVoiceTestWithIdOnly = await prisma.ttsVoiceTest.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TtsVoiceTestFindManyArgs>(args?: SelectSubset<T, TtsVoiceTestFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TtsVoiceTest.
     * @param {TtsVoiceTestCreateArgs} args - Arguments to create a TtsVoiceTest.
     * @example
     * // Create one TtsVoiceTest
     * const TtsVoiceTest = await prisma.ttsVoiceTest.create({
     *   data: {
     *     // ... data to create a TtsVoiceTest
     *   }
     * })
     * 
     */
    create<T extends TtsVoiceTestCreateArgs>(args: SelectSubset<T, TtsVoiceTestCreateArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TtsVoiceTests.
     * @param {TtsVoiceTestCreateManyArgs} args - Arguments to create many TtsVoiceTests.
     * @example
     * // Create many TtsVoiceTests
     * const ttsVoiceTest = await prisma.ttsVoiceTest.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TtsVoiceTestCreateManyArgs>(args?: SelectSubset<T, TtsVoiceTestCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TtsVoiceTests and returns the data saved in the database.
     * @param {TtsVoiceTestCreateManyAndReturnArgs} args - Arguments to create many TtsVoiceTests.
     * @example
     * // Create many TtsVoiceTests
     * const ttsVoiceTest = await prisma.ttsVoiceTest.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TtsVoiceTests and only return the `id`
     * const ttsVoiceTestWithIdOnly = await prisma.ttsVoiceTest.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TtsVoiceTestCreateManyAndReturnArgs>(args?: SelectSubset<T, TtsVoiceTestCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TtsVoiceTest.
     * @param {TtsVoiceTestDeleteArgs} args - Arguments to delete one TtsVoiceTest.
     * @example
     * // Delete one TtsVoiceTest
     * const TtsVoiceTest = await prisma.ttsVoiceTest.delete({
     *   where: {
     *     // ... filter to delete one TtsVoiceTest
     *   }
     * })
     * 
     */
    delete<T extends TtsVoiceTestDeleteArgs>(args: SelectSubset<T, TtsVoiceTestDeleteArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TtsVoiceTest.
     * @param {TtsVoiceTestUpdateArgs} args - Arguments to update one TtsVoiceTest.
     * @example
     * // Update one TtsVoiceTest
     * const ttsVoiceTest = await prisma.ttsVoiceTest.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TtsVoiceTestUpdateArgs>(args: SelectSubset<T, TtsVoiceTestUpdateArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TtsVoiceTests.
     * @param {TtsVoiceTestDeleteManyArgs} args - Arguments to filter TtsVoiceTests to delete.
     * @example
     * // Delete a few TtsVoiceTests
     * const { count } = await prisma.ttsVoiceTest.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TtsVoiceTestDeleteManyArgs>(args?: SelectSubset<T, TtsVoiceTestDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsVoiceTests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceTestUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TtsVoiceTests
     * const ttsVoiceTest = await prisma.ttsVoiceTest.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TtsVoiceTestUpdateManyArgs>(args: SelectSubset<T, TtsVoiceTestUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsVoiceTests and returns the data updated in the database.
     * @param {TtsVoiceTestUpdateManyAndReturnArgs} args - Arguments to update many TtsVoiceTests.
     * @example
     * // Update many TtsVoiceTests
     * const ttsVoiceTest = await prisma.ttsVoiceTest.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TtsVoiceTests and only return the `id`
     * const ttsVoiceTestWithIdOnly = await prisma.ttsVoiceTest.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TtsVoiceTestUpdateManyAndReturnArgs>(args: SelectSubset<T, TtsVoiceTestUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TtsVoiceTest.
     * @param {TtsVoiceTestUpsertArgs} args - Arguments to update or create a TtsVoiceTest.
     * @example
     * // Update or create a TtsVoiceTest
     * const ttsVoiceTest = await prisma.ttsVoiceTest.upsert({
     *   create: {
     *     // ... data to create a TtsVoiceTest
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TtsVoiceTest we want to update
     *   }
     * })
     */
    upsert<T extends TtsVoiceTestUpsertArgs>(args: SelectSubset<T, TtsVoiceTestUpsertArgs<ExtArgs>>): Prisma__TtsVoiceTestClient<$Result.GetResult<Prisma.$TtsVoiceTestPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TtsVoiceTests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceTestCountArgs} args - Arguments to filter TtsVoiceTests to count.
     * @example
     * // Count the number of TtsVoiceTests
     * const count = await prisma.ttsVoiceTest.count({
     *   where: {
     *     // ... the filter for the TtsVoiceTests we want to count
     *   }
     * })
    **/
    count<T extends TtsVoiceTestCountArgs>(
      args?: Subset<T, TtsVoiceTestCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TtsVoiceTestCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TtsVoiceTest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceTestAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TtsVoiceTestAggregateArgs>(args: Subset<T, TtsVoiceTestAggregateArgs>): Prisma.PrismaPromise<GetTtsVoiceTestAggregateType<T>>

    /**
     * Group by TtsVoiceTest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsVoiceTestGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TtsVoiceTestGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TtsVoiceTestGroupByArgs['orderBy'] }
        : { orderBy?: TtsVoiceTestGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TtsVoiceTestGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTtsVoiceTestGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TtsVoiceTest model
   */
  readonly fields: TtsVoiceTestFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TtsVoiceTest.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TtsVoiceTestClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TtsVoiceTest model
   */
  interface TtsVoiceTestFieldRefs {
    readonly id: FieldRef<"TtsVoiceTest", 'Int'>
    readonly cacheKey: FieldRef<"TtsVoiceTest", 'String'>
    readonly voiceName: FieldRef<"TtsVoiceTest", 'String'>
    readonly rate: FieldRef<"TtsVoiceTest", 'Float'>
    readonly text: FieldRef<"TtsVoiceTest", 'String'>
    readonly audioMp3: FieldRef<"TtsVoiceTest", 'Bytes'>
    readonly volumeSound: FieldRef<"TtsVoiceTest", 'Float'>
    readonly createdAt: FieldRef<"TtsVoiceTest", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TtsVoiceTest findUnique
   */
  export type TtsVoiceTestFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceTest to fetch.
     */
    where: TtsVoiceTestWhereUniqueInput
  }

  /**
   * TtsVoiceTest findUniqueOrThrow
   */
  export type TtsVoiceTestFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceTest to fetch.
     */
    where: TtsVoiceTestWhereUniqueInput
  }

  /**
   * TtsVoiceTest findFirst
   */
  export type TtsVoiceTestFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceTest to fetch.
     */
    where?: TtsVoiceTestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceTests to fetch.
     */
    orderBy?: TtsVoiceTestOrderByWithRelationInput | TtsVoiceTestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsVoiceTests.
     */
    cursor?: TtsVoiceTestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceTests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceTests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsVoiceTests.
     */
    distinct?: TtsVoiceTestScalarFieldEnum | TtsVoiceTestScalarFieldEnum[]
  }

  /**
   * TtsVoiceTest findFirstOrThrow
   */
  export type TtsVoiceTestFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceTest to fetch.
     */
    where?: TtsVoiceTestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceTests to fetch.
     */
    orderBy?: TtsVoiceTestOrderByWithRelationInput | TtsVoiceTestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TtsVoiceTests.
     */
    cursor?: TtsVoiceTestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceTests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceTests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TtsVoiceTests.
     */
    distinct?: TtsVoiceTestScalarFieldEnum | TtsVoiceTestScalarFieldEnum[]
  }

  /**
   * TtsVoiceTest findMany
   */
  export type TtsVoiceTestFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * Filter, which TtsVoiceTests to fetch.
     */
    where?: TtsVoiceTestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TtsVoiceTests to fetch.
     */
    orderBy?: TtsVoiceTestOrderByWithRelationInput | TtsVoiceTestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TtsVoiceTests.
     */
    cursor?: TtsVoiceTestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TtsVoiceTests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TtsVoiceTests.
     */
    skip?: number
    distinct?: TtsVoiceTestScalarFieldEnum | TtsVoiceTestScalarFieldEnum[]
  }

  /**
   * TtsVoiceTest create
   */
  export type TtsVoiceTestCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * The data needed to create a TtsVoiceTest.
     */
    data: XOR<TtsVoiceTestCreateInput, TtsVoiceTestUncheckedCreateInput>
  }

  /**
   * TtsVoiceTest createMany
   */
  export type TtsVoiceTestCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TtsVoiceTests.
     */
    data: TtsVoiceTestCreateManyInput | TtsVoiceTestCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsVoiceTest createManyAndReturn
   */
  export type TtsVoiceTestCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * The data used to create many TtsVoiceTests.
     */
    data: TtsVoiceTestCreateManyInput | TtsVoiceTestCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TtsVoiceTest update
   */
  export type TtsVoiceTestUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * The data needed to update a TtsVoiceTest.
     */
    data: XOR<TtsVoiceTestUpdateInput, TtsVoiceTestUncheckedUpdateInput>
    /**
     * Choose, which TtsVoiceTest to update.
     */
    where: TtsVoiceTestWhereUniqueInput
  }

  /**
   * TtsVoiceTest updateMany
   */
  export type TtsVoiceTestUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TtsVoiceTests.
     */
    data: XOR<TtsVoiceTestUpdateManyMutationInput, TtsVoiceTestUncheckedUpdateManyInput>
    /**
     * Filter which TtsVoiceTests to update
     */
    where?: TtsVoiceTestWhereInput
    /**
     * Limit how many TtsVoiceTests to update.
     */
    limit?: number
  }

  /**
   * TtsVoiceTest updateManyAndReturn
   */
  export type TtsVoiceTestUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * The data used to update TtsVoiceTests.
     */
    data: XOR<TtsVoiceTestUpdateManyMutationInput, TtsVoiceTestUncheckedUpdateManyInput>
    /**
     * Filter which TtsVoiceTests to update
     */
    where?: TtsVoiceTestWhereInput
    /**
     * Limit how many TtsVoiceTests to update.
     */
    limit?: number
  }

  /**
   * TtsVoiceTest upsert
   */
  export type TtsVoiceTestUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * The filter to search for the TtsVoiceTest to update in case it exists.
     */
    where: TtsVoiceTestWhereUniqueInput
    /**
     * In case the TtsVoiceTest found by the `where` argument doesn't exist, create a new TtsVoiceTest with this data.
     */
    create: XOR<TtsVoiceTestCreateInput, TtsVoiceTestUncheckedCreateInput>
    /**
     * In case the TtsVoiceTest was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TtsVoiceTestUpdateInput, TtsVoiceTestUncheckedUpdateInput>
  }

  /**
   * TtsVoiceTest delete
   */
  export type TtsVoiceTestDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
    /**
     * Filter which TtsVoiceTest to delete.
     */
    where: TtsVoiceTestWhereUniqueInput
  }

  /**
   * TtsVoiceTest deleteMany
   */
  export type TtsVoiceTestDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TtsVoiceTests to delete
     */
    where?: TtsVoiceTestWhereInput
    /**
     * Limit how many TtsVoiceTests to delete.
     */
    limit?: number
  }

  /**
   * TtsVoiceTest without action
   */
  export type TtsVoiceTestDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TtsVoiceTest
     */
    select?: TtsVoiceTestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TtsVoiceTest
     */
    omit?: TtsVoiceTestOmit<ExtArgs> | null
  }


  /**
   * Model ttsEvent
   */

  export type AggregateTtsEvent = {
    _count: TtsEventCountAggregateOutputType | null
    _min: TtsEventMinAggregateOutputType | null
    _max: TtsEventMaxAggregateOutputType | null
  }

  export type TtsEventMinAggregateOutputType = {
    eventId: string | null
    audioContent: Bytes | null
    createdAt: Date | null
  }

  export type TtsEventMaxAggregateOutputType = {
    eventId: string | null
    audioContent: Bytes | null
    createdAt: Date | null
  }

  export type TtsEventCountAggregateOutputType = {
    eventId: number
    audioContent: number
    createdAt: number
    _all: number
  }


  export type TtsEventMinAggregateInputType = {
    eventId?: true
    audioContent?: true
    createdAt?: true
  }

  export type TtsEventMaxAggregateInputType = {
    eventId?: true
    audioContent?: true
    createdAt?: true
  }

  export type TtsEventCountAggregateInputType = {
    eventId?: true
    audioContent?: true
    createdAt?: true
    _all?: true
  }

  export type TtsEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ttsEvent to aggregate.
     */
    where?: ttsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ttsEvents to fetch.
     */
    orderBy?: ttsEventOrderByWithRelationInput | ttsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ttsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ttsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ttsEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ttsEvents
    **/
    _count?: true | TtsEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TtsEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TtsEventMaxAggregateInputType
  }

  export type GetTtsEventAggregateType<T extends TtsEventAggregateArgs> = {
        [P in keyof T & keyof AggregateTtsEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTtsEvent[P]>
      : GetScalarType<T[P], AggregateTtsEvent[P]>
  }




  export type ttsEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ttsEventWhereInput
    orderBy?: ttsEventOrderByWithAggregationInput | ttsEventOrderByWithAggregationInput[]
    by: TtsEventScalarFieldEnum[] | TtsEventScalarFieldEnum
    having?: ttsEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TtsEventCountAggregateInputType | true
    _min?: TtsEventMinAggregateInputType
    _max?: TtsEventMaxAggregateInputType
  }

  export type TtsEventGroupByOutputType = {
    eventId: string
    audioContent: Bytes | null
    createdAt: Date
    _count: TtsEventCountAggregateOutputType | null
    _min: TtsEventMinAggregateOutputType | null
    _max: TtsEventMaxAggregateOutputType | null
  }

  type GetTtsEventGroupByPayload<T extends ttsEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TtsEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TtsEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TtsEventGroupByOutputType[P]>
            : GetScalarType<T[P], TtsEventGroupByOutputType[P]>
        }
      >
    >


  export type ttsEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    eventId?: boolean
    audioContent?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsEvent"]>

  export type ttsEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    eventId?: boolean
    audioContent?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsEvent"]>

  export type ttsEventSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    eventId?: boolean
    audioContent?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ttsEvent"]>

  export type ttsEventSelectScalar = {
    eventId?: boolean
    audioContent?: boolean
    createdAt?: boolean
  }

  export type ttsEventOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"eventId" | "audioContent" | "createdAt", ExtArgs["result"]["ttsEvent"]>

  export type $ttsEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ttsEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      eventId: string
      audioContent: Prisma.Bytes | null
      createdAt: Date
    }, ExtArgs["result"]["ttsEvent"]>
    composites: {}
  }

  type ttsEventGetPayload<S extends boolean | null | undefined | ttsEventDefaultArgs> = $Result.GetResult<Prisma.$ttsEventPayload, S>

  type ttsEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ttsEventFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TtsEventCountAggregateInputType | true
    }

  export interface ttsEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ttsEvent'], meta: { name: 'ttsEvent' } }
    /**
     * Find zero or one TtsEvent that matches the filter.
     * @param {ttsEventFindUniqueArgs} args - Arguments to find a TtsEvent
     * @example
     * // Get one TtsEvent
     * const ttsEvent = await prisma.ttsEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ttsEventFindUniqueArgs>(args: SelectSubset<T, ttsEventFindUniqueArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TtsEvent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ttsEventFindUniqueOrThrowArgs} args - Arguments to find a TtsEvent
     * @example
     * // Get one TtsEvent
     * const ttsEvent = await prisma.ttsEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ttsEventFindUniqueOrThrowArgs>(args: SelectSubset<T, ttsEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ttsEventFindFirstArgs} args - Arguments to find a TtsEvent
     * @example
     * // Get one TtsEvent
     * const ttsEvent = await prisma.ttsEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ttsEventFindFirstArgs>(args?: SelectSubset<T, ttsEventFindFirstArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TtsEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ttsEventFindFirstOrThrowArgs} args - Arguments to find a TtsEvent
     * @example
     * // Get one TtsEvent
     * const ttsEvent = await prisma.ttsEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ttsEventFindFirstOrThrowArgs>(args?: SelectSubset<T, ttsEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TtsEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ttsEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TtsEvents
     * const ttsEvents = await prisma.ttsEvent.findMany()
     * 
     * // Get first 10 TtsEvents
     * const ttsEvents = await prisma.ttsEvent.findMany({ take: 10 })
     * 
     * // Only select the `eventId`
     * const ttsEventWithEventIdOnly = await prisma.ttsEvent.findMany({ select: { eventId: true } })
     * 
     */
    findMany<T extends ttsEventFindManyArgs>(args?: SelectSubset<T, ttsEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TtsEvent.
     * @param {ttsEventCreateArgs} args - Arguments to create a TtsEvent.
     * @example
     * // Create one TtsEvent
     * const TtsEvent = await prisma.ttsEvent.create({
     *   data: {
     *     // ... data to create a TtsEvent
     *   }
     * })
     * 
     */
    create<T extends ttsEventCreateArgs>(args: SelectSubset<T, ttsEventCreateArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TtsEvents.
     * @param {ttsEventCreateManyArgs} args - Arguments to create many TtsEvents.
     * @example
     * // Create many TtsEvents
     * const ttsEvent = await prisma.ttsEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ttsEventCreateManyArgs>(args?: SelectSubset<T, ttsEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TtsEvents and returns the data saved in the database.
     * @param {ttsEventCreateManyAndReturnArgs} args - Arguments to create many TtsEvents.
     * @example
     * // Create many TtsEvents
     * const ttsEvent = await prisma.ttsEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TtsEvents and only return the `eventId`
     * const ttsEventWithEventIdOnly = await prisma.ttsEvent.createManyAndReturn({
     *   select: { eventId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ttsEventCreateManyAndReturnArgs>(args?: SelectSubset<T, ttsEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TtsEvent.
     * @param {ttsEventDeleteArgs} args - Arguments to delete one TtsEvent.
     * @example
     * // Delete one TtsEvent
     * const TtsEvent = await prisma.ttsEvent.delete({
     *   where: {
     *     // ... filter to delete one TtsEvent
     *   }
     * })
     * 
     */
    delete<T extends ttsEventDeleteArgs>(args: SelectSubset<T, ttsEventDeleteArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TtsEvent.
     * @param {ttsEventUpdateArgs} args - Arguments to update one TtsEvent.
     * @example
     * // Update one TtsEvent
     * const ttsEvent = await prisma.ttsEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ttsEventUpdateArgs>(args: SelectSubset<T, ttsEventUpdateArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TtsEvents.
     * @param {ttsEventDeleteManyArgs} args - Arguments to filter TtsEvents to delete.
     * @example
     * // Delete a few TtsEvents
     * const { count } = await prisma.ttsEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ttsEventDeleteManyArgs>(args?: SelectSubset<T, ttsEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ttsEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TtsEvents
     * const ttsEvent = await prisma.ttsEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ttsEventUpdateManyArgs>(args: SelectSubset<T, ttsEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TtsEvents and returns the data updated in the database.
     * @param {ttsEventUpdateManyAndReturnArgs} args - Arguments to update many TtsEvents.
     * @example
     * // Update many TtsEvents
     * const ttsEvent = await prisma.ttsEvent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TtsEvents and only return the `eventId`
     * const ttsEventWithEventIdOnly = await prisma.ttsEvent.updateManyAndReturn({
     *   select: { eventId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ttsEventUpdateManyAndReturnArgs>(args: SelectSubset<T, ttsEventUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TtsEvent.
     * @param {ttsEventUpsertArgs} args - Arguments to update or create a TtsEvent.
     * @example
     * // Update or create a TtsEvent
     * const ttsEvent = await prisma.ttsEvent.upsert({
     *   create: {
     *     // ... data to create a TtsEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TtsEvent we want to update
     *   }
     * })
     */
    upsert<T extends ttsEventUpsertArgs>(args: SelectSubset<T, ttsEventUpsertArgs<ExtArgs>>): Prisma__ttsEventClient<$Result.GetResult<Prisma.$ttsEventPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TtsEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ttsEventCountArgs} args - Arguments to filter TtsEvents to count.
     * @example
     * // Count the number of TtsEvents
     * const count = await prisma.ttsEvent.count({
     *   where: {
     *     // ... the filter for the TtsEvents we want to count
     *   }
     * })
    **/
    count<T extends ttsEventCountArgs>(
      args?: Subset<T, ttsEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TtsEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TtsEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TtsEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TtsEventAggregateArgs>(args: Subset<T, TtsEventAggregateArgs>): Prisma.PrismaPromise<GetTtsEventAggregateType<T>>

    /**
     * Group by TtsEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ttsEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ttsEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ttsEventGroupByArgs['orderBy'] }
        : { orderBy?: ttsEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ttsEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTtsEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ttsEvent model
   */
  readonly fields: ttsEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ttsEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ttsEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ttsEvent model
   */
  interface ttsEventFieldRefs {
    readonly eventId: FieldRef<"ttsEvent", 'String'>
    readonly audioContent: FieldRef<"ttsEvent", 'Bytes'>
    readonly createdAt: FieldRef<"ttsEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ttsEvent findUnique
   */
  export type ttsEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * Filter, which ttsEvent to fetch.
     */
    where: ttsEventWhereUniqueInput
  }

  /**
   * ttsEvent findUniqueOrThrow
   */
  export type ttsEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * Filter, which ttsEvent to fetch.
     */
    where: ttsEventWhereUniqueInput
  }

  /**
   * ttsEvent findFirst
   */
  export type ttsEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * Filter, which ttsEvent to fetch.
     */
    where?: ttsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ttsEvents to fetch.
     */
    orderBy?: ttsEventOrderByWithRelationInput | ttsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ttsEvents.
     */
    cursor?: ttsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ttsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ttsEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ttsEvents.
     */
    distinct?: TtsEventScalarFieldEnum | TtsEventScalarFieldEnum[]
  }

  /**
   * ttsEvent findFirstOrThrow
   */
  export type ttsEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * Filter, which ttsEvent to fetch.
     */
    where?: ttsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ttsEvents to fetch.
     */
    orderBy?: ttsEventOrderByWithRelationInput | ttsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ttsEvents.
     */
    cursor?: ttsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ttsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ttsEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ttsEvents.
     */
    distinct?: TtsEventScalarFieldEnum | TtsEventScalarFieldEnum[]
  }

  /**
   * ttsEvent findMany
   */
  export type ttsEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * Filter, which ttsEvents to fetch.
     */
    where?: ttsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ttsEvents to fetch.
     */
    orderBy?: ttsEventOrderByWithRelationInput | ttsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ttsEvents.
     */
    cursor?: ttsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ttsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ttsEvents.
     */
    skip?: number
    distinct?: TtsEventScalarFieldEnum | TtsEventScalarFieldEnum[]
  }

  /**
   * ttsEvent create
   */
  export type ttsEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * The data needed to create a ttsEvent.
     */
    data: XOR<ttsEventCreateInput, ttsEventUncheckedCreateInput>
  }

  /**
   * ttsEvent createMany
   */
  export type ttsEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ttsEvents.
     */
    data: ttsEventCreateManyInput | ttsEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ttsEvent createManyAndReturn
   */
  export type ttsEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * The data used to create many ttsEvents.
     */
    data: ttsEventCreateManyInput | ttsEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ttsEvent update
   */
  export type ttsEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * The data needed to update a ttsEvent.
     */
    data: XOR<ttsEventUpdateInput, ttsEventUncheckedUpdateInput>
    /**
     * Choose, which ttsEvent to update.
     */
    where: ttsEventWhereUniqueInput
  }

  /**
   * ttsEvent updateMany
   */
  export type ttsEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ttsEvents.
     */
    data: XOR<ttsEventUpdateManyMutationInput, ttsEventUncheckedUpdateManyInput>
    /**
     * Filter which ttsEvents to update
     */
    where?: ttsEventWhereInput
    /**
     * Limit how many ttsEvents to update.
     */
    limit?: number
  }

  /**
   * ttsEvent updateManyAndReturn
   */
  export type ttsEventUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * The data used to update ttsEvents.
     */
    data: XOR<ttsEventUpdateManyMutationInput, ttsEventUncheckedUpdateManyInput>
    /**
     * Filter which ttsEvents to update
     */
    where?: ttsEventWhereInput
    /**
     * Limit how many ttsEvents to update.
     */
    limit?: number
  }

  /**
   * ttsEvent upsert
   */
  export type ttsEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * The filter to search for the ttsEvent to update in case it exists.
     */
    where: ttsEventWhereUniqueInput
    /**
     * In case the ttsEvent found by the `where` argument doesn't exist, create a new ttsEvent with this data.
     */
    create: XOR<ttsEventCreateInput, ttsEventUncheckedCreateInput>
    /**
     * In case the ttsEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ttsEventUpdateInput, ttsEventUncheckedUpdateInput>
  }

  /**
   * ttsEvent delete
   */
  export type ttsEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
    /**
     * Filter which ttsEvent to delete.
     */
    where: ttsEventWhereUniqueInput
  }

  /**
   * ttsEvent deleteMany
   */
  export type ttsEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ttsEvents to delete
     */
    where?: ttsEventWhereInput
    /**
     * Limit how many ttsEvents to delete.
     */
    limit?: number
  }

  /**
   * ttsEvent without action
   */
  export type ttsEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ttsEvent
     */
    select?: ttsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ttsEvent
     */
    omit?: ttsEventOmit<ExtArgs> | null
  }


  /**
   * Model token
   */

  export type AggregateToken = {
    _count: TokenCountAggregateOutputType | null
    _avg: TokenAvgAggregateOutputType | null
    _sum: TokenSumAggregateOutputType | null
    _min: TokenMinAggregateOutputType | null
    _max: TokenMaxAggregateOutputType | null
  }

  export type TokenAvgAggregateOutputType = {
    Id: number | null
  }

  export type TokenSumAggregateOutputType = {
    Id: bigint | null
  }

  export type TokenMinAggregateOutputType = {
    tokenHash: string | null
    name: string | null
    scope: string | null
    expiresAt: Date | null
    revokedAt: string | null
    createdAt: Date | null
    Id: bigint | null
  }

  export type TokenMaxAggregateOutputType = {
    tokenHash: string | null
    name: string | null
    scope: string | null
    expiresAt: Date | null
    revokedAt: string | null
    createdAt: Date | null
    Id: bigint | null
  }

  export type TokenCountAggregateOutputType = {
    tokenHash: number
    name: number
    scope: number
    expiresAt: number
    revokedAt: number
    createdAt: number
    Id: number
    _all: number
  }


  export type TokenAvgAggregateInputType = {
    Id?: true
  }

  export type TokenSumAggregateInputType = {
    Id?: true
  }

  export type TokenMinAggregateInputType = {
    tokenHash?: true
    name?: true
    scope?: true
    expiresAt?: true
    revokedAt?: true
    createdAt?: true
    Id?: true
  }

  export type TokenMaxAggregateInputType = {
    tokenHash?: true
    name?: true
    scope?: true
    expiresAt?: true
    revokedAt?: true
    createdAt?: true
    Id?: true
  }

  export type TokenCountAggregateInputType = {
    tokenHash?: true
    name?: true
    scope?: true
    expiresAt?: true
    revokedAt?: true
    createdAt?: true
    Id?: true
    _all?: true
  }

  export type TokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which token to aggregate.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned tokens
    **/
    _count?: true | TokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TokenAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TokenSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TokenMaxAggregateInputType
  }

  export type GetTokenAggregateType<T extends TokenAggregateArgs> = {
        [P in keyof T & keyof AggregateToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateToken[P]>
      : GetScalarType<T[P], AggregateToken[P]>
  }




  export type tokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: tokenWhereInput
    orderBy?: tokenOrderByWithAggregationInput | tokenOrderByWithAggregationInput[]
    by: TokenScalarFieldEnum[] | TokenScalarFieldEnum
    having?: tokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TokenCountAggregateInputType | true
    _avg?: TokenAvgAggregateInputType
    _sum?: TokenSumAggregateInputType
    _min?: TokenMinAggregateInputType
    _max?: TokenMaxAggregateInputType
  }

  export type TokenGroupByOutputType = {
    tokenHash: string
    name: string
    scope: string | null
    expiresAt: Date
    revokedAt: string | null
    createdAt: Date
    Id: bigint
    _count: TokenCountAggregateOutputType | null
    _avg: TokenAvgAggregateOutputType | null
    _sum: TokenSumAggregateOutputType | null
    _min: TokenMinAggregateOutputType | null
    _max: TokenMaxAggregateOutputType | null
  }

  type GetTokenGroupByPayload<T extends tokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TokenGroupByOutputType[P]>
            : GetScalarType<T[P], TokenGroupByOutputType[P]>
        }
      >
    >


  export type tokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tokenHash?: boolean
    name?: boolean
    scope?: boolean
    expiresAt?: boolean
    revokedAt?: boolean
    createdAt?: boolean
    Id?: boolean
  }, ExtArgs["result"]["token"]>

  export type tokenSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tokenHash?: boolean
    name?: boolean
    scope?: boolean
    expiresAt?: boolean
    revokedAt?: boolean
    createdAt?: boolean
    Id?: boolean
  }, ExtArgs["result"]["token"]>

  export type tokenSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tokenHash?: boolean
    name?: boolean
    scope?: boolean
    expiresAt?: boolean
    revokedAt?: boolean
    createdAt?: boolean
    Id?: boolean
  }, ExtArgs["result"]["token"]>

  export type tokenSelectScalar = {
    tokenHash?: boolean
    name?: boolean
    scope?: boolean
    expiresAt?: boolean
    revokedAt?: boolean
    createdAt?: boolean
    Id?: boolean
  }

  export type tokenOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"tokenHash" | "name" | "scope" | "expiresAt" | "revokedAt" | "createdAt" | "Id", ExtArgs["result"]["token"]>

  export type $tokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "token"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      tokenHash: string
      name: string
      scope: string | null
      expiresAt: Date
      revokedAt: string | null
      createdAt: Date
      Id: bigint
    }, ExtArgs["result"]["token"]>
    composites: {}
  }

  type tokenGetPayload<S extends boolean | null | undefined | tokenDefaultArgs> = $Result.GetResult<Prisma.$tokenPayload, S>

  type tokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<tokenFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TokenCountAggregateInputType | true
    }

  export interface tokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['token'], meta: { name: 'token' } }
    /**
     * Find zero or one Token that matches the filter.
     * @param {tokenFindUniqueArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends tokenFindUniqueArgs>(args: SelectSubset<T, tokenFindUniqueArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Token that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {tokenFindUniqueOrThrowArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends tokenFindUniqueOrThrowArgs>(args: SelectSubset<T, tokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Token that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenFindFirstArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends tokenFindFirstArgs>(args?: SelectSubset<T, tokenFindFirstArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Token that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenFindFirstOrThrowArgs} args - Arguments to find a Token
     * @example
     * // Get one Token
     * const token = await prisma.token.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends tokenFindFirstOrThrowArgs>(args?: SelectSubset<T, tokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tokens
     * const tokens = await prisma.token.findMany()
     * 
     * // Get first 10 Tokens
     * const tokens = await prisma.token.findMany({ take: 10 })
     * 
     * // Only select the `tokenHash`
     * const tokenWithTokenHashOnly = await prisma.token.findMany({ select: { tokenHash: true } })
     * 
     */
    findMany<T extends tokenFindManyArgs>(args?: SelectSubset<T, tokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Token.
     * @param {tokenCreateArgs} args - Arguments to create a Token.
     * @example
     * // Create one Token
     * const Token = await prisma.token.create({
     *   data: {
     *     // ... data to create a Token
     *   }
     * })
     * 
     */
    create<T extends tokenCreateArgs>(args: SelectSubset<T, tokenCreateArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tokens.
     * @param {tokenCreateManyArgs} args - Arguments to create many Tokens.
     * @example
     * // Create many Tokens
     * const token = await prisma.token.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends tokenCreateManyArgs>(args?: SelectSubset<T, tokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tokens and returns the data saved in the database.
     * @param {tokenCreateManyAndReturnArgs} args - Arguments to create many Tokens.
     * @example
     * // Create many Tokens
     * const token = await prisma.token.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tokens and only return the `tokenHash`
     * const tokenWithTokenHashOnly = await prisma.token.createManyAndReturn({
     *   select: { tokenHash: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends tokenCreateManyAndReturnArgs>(args?: SelectSubset<T, tokenCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Token.
     * @param {tokenDeleteArgs} args - Arguments to delete one Token.
     * @example
     * // Delete one Token
     * const Token = await prisma.token.delete({
     *   where: {
     *     // ... filter to delete one Token
     *   }
     * })
     * 
     */
    delete<T extends tokenDeleteArgs>(args: SelectSubset<T, tokenDeleteArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Token.
     * @param {tokenUpdateArgs} args - Arguments to update one Token.
     * @example
     * // Update one Token
     * const token = await prisma.token.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends tokenUpdateArgs>(args: SelectSubset<T, tokenUpdateArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tokens.
     * @param {tokenDeleteManyArgs} args - Arguments to filter Tokens to delete.
     * @example
     * // Delete a few Tokens
     * const { count } = await prisma.token.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends tokenDeleteManyArgs>(args?: SelectSubset<T, tokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tokens
     * const token = await prisma.token.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends tokenUpdateManyArgs>(args: SelectSubset<T, tokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tokens and returns the data updated in the database.
     * @param {tokenUpdateManyAndReturnArgs} args - Arguments to update many Tokens.
     * @example
     * // Update many Tokens
     * const token = await prisma.token.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tokens and only return the `tokenHash`
     * const tokenWithTokenHashOnly = await prisma.token.updateManyAndReturn({
     *   select: { tokenHash: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends tokenUpdateManyAndReturnArgs>(args: SelectSubset<T, tokenUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Token.
     * @param {tokenUpsertArgs} args - Arguments to update or create a Token.
     * @example
     * // Update or create a Token
     * const token = await prisma.token.upsert({
     *   create: {
     *     // ... data to create a Token
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Token we want to update
     *   }
     * })
     */
    upsert<T extends tokenUpsertArgs>(args: SelectSubset<T, tokenUpsertArgs<ExtArgs>>): Prisma__tokenClient<$Result.GetResult<Prisma.$tokenPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenCountArgs} args - Arguments to filter Tokens to count.
     * @example
     * // Count the number of Tokens
     * const count = await prisma.token.count({
     *   where: {
     *     // ... the filter for the Tokens we want to count
     *   }
     * })
    **/
    count<T extends tokenCountArgs>(
      args?: Subset<T, tokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Token.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TokenAggregateArgs>(args: Subset<T, TokenAggregateArgs>): Prisma.PrismaPromise<GetTokenAggregateType<T>>

    /**
     * Group by Token.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {tokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends tokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: tokenGroupByArgs['orderBy'] }
        : { orderBy?: tokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, tokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the token model
   */
  readonly fields: tokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for token.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__tokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the token model
   */
  interface tokenFieldRefs {
    readonly tokenHash: FieldRef<"token", 'String'>
    readonly name: FieldRef<"token", 'String'>
    readonly scope: FieldRef<"token", 'String'>
    readonly expiresAt: FieldRef<"token", 'DateTime'>
    readonly revokedAt: FieldRef<"token", 'String'>
    readonly createdAt: FieldRef<"token", 'DateTime'>
    readonly Id: FieldRef<"token", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * token findUnique
   */
  export type tokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token findUniqueOrThrow
   */
  export type tokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token findFirst
   */
  export type tokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for tokens.
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of tokens.
     */
    distinct?: TokenScalarFieldEnum | TokenScalarFieldEnum[]
  }

  /**
   * token findFirstOrThrow
   */
  export type tokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which token to fetch.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for tokens.
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of tokens.
     */
    distinct?: TokenScalarFieldEnum | TokenScalarFieldEnum[]
  }

  /**
   * token findMany
   */
  export type tokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter, which tokens to fetch.
     */
    where?: tokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of tokens to fetch.
     */
    orderBy?: tokenOrderByWithRelationInput | tokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing tokens.
     */
    cursor?: tokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` tokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` tokens.
     */
    skip?: number
    distinct?: TokenScalarFieldEnum | TokenScalarFieldEnum[]
  }

  /**
   * token create
   */
  export type tokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data needed to create a token.
     */
    data: XOR<tokenCreateInput, tokenUncheckedCreateInput>
  }

  /**
   * token createMany
   */
  export type tokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many tokens.
     */
    data: tokenCreateManyInput | tokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * token createManyAndReturn
   */
  export type tokenCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data used to create many tokens.
     */
    data: tokenCreateManyInput | tokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * token update
   */
  export type tokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data needed to update a token.
     */
    data: XOR<tokenUpdateInput, tokenUncheckedUpdateInput>
    /**
     * Choose, which token to update.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token updateMany
   */
  export type tokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update tokens.
     */
    data: XOR<tokenUpdateManyMutationInput, tokenUncheckedUpdateManyInput>
    /**
     * Filter which tokens to update
     */
    where?: tokenWhereInput
    /**
     * Limit how many tokens to update.
     */
    limit?: number
  }

  /**
   * token updateManyAndReturn
   */
  export type tokenUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The data used to update tokens.
     */
    data: XOR<tokenUpdateManyMutationInput, tokenUncheckedUpdateManyInput>
    /**
     * Filter which tokens to update
     */
    where?: tokenWhereInput
    /**
     * Limit how many tokens to update.
     */
    limit?: number
  }

  /**
   * token upsert
   */
  export type tokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * The filter to search for the token to update in case it exists.
     */
    where: tokenWhereUniqueInput
    /**
     * In case the token found by the `where` argument doesn't exist, create a new token with this data.
     */
    create: XOR<tokenCreateInput, tokenUncheckedCreateInput>
    /**
     * In case the token was found with the provided `where` argument, update it with this data.
     */
    update: XOR<tokenUpdateInput, tokenUncheckedUpdateInput>
  }

  /**
   * token delete
   */
  export type tokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
    /**
     * Filter which token to delete.
     */
    where: tokenWhereUniqueInput
  }

  /**
   * token deleteMany
   */
  export type tokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which tokens to delete
     */
    where?: tokenWhereInput
    /**
     * Limit how many tokens to delete.
     */
    limit?: number
  }

  /**
   * token without action
   */
  export type tokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the token
     */
    select?: tokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the token
     */
    omit?: tokenOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const TtsDailyUsageScalarFieldEnum: {
    id: 'id',
    date: 'date',
    chars: 'chars',
    requests: 'requests'
  };

  export type TtsDailyUsageScalarFieldEnum = (typeof TtsDailyUsageScalarFieldEnum)[keyof typeof TtsDailyUsageScalarFieldEnum]


  export const TtsWeekVoiceScalarFieldEnum: {
    id: 'id',
    year: 'year',
    week: 'week',
    voiceName: 'voiceName',
    createdAt: 'createdAt'
  };

  export type TtsWeekVoiceScalarFieldEnum = (typeof TtsWeekVoiceScalarFieldEnum)[keyof typeof TtsWeekVoiceScalarFieldEnum]


  export const TtsSettingsScalarFieldEnum: {
    id: 'id',
    rate: 'rate',
    volumeSound: 'volumeSound',
    updatedAt: 'updatedAt'
  };

  export type TtsSettingsScalarFieldEnum = (typeof TtsSettingsScalarFieldEnum)[keyof typeof TtsSettingsScalarFieldEnum]


  export const TtsVoiceOverrideScalarFieldEnum: {
    id: 'id',
    year: 'year',
    week: 'week',
    voiceName: 'voiceName',
    updatedAt: 'updatedAt'
  };

  export type TtsVoiceOverrideScalarFieldEnum = (typeof TtsVoiceOverrideScalarFieldEnum)[keyof typeof TtsVoiceOverrideScalarFieldEnum]


  export const NameDictionaryScalarFieldEnum: {
    id: 'id',
    key: 'key',
    value: 'value',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type NameDictionaryScalarFieldEnum = (typeof NameDictionaryScalarFieldEnum)[keyof typeof NameDictionaryScalarFieldEnum]


  export const TtsVoiceTestScalarFieldEnum: {
    id: 'id',
    cacheKey: 'cacheKey',
    voiceName: 'voiceName',
    rate: 'rate',
    text: 'text',
    audioMp3: 'audioMp3',
    volumeSound: 'volumeSound',
    createdAt: 'createdAt'
  };

  export type TtsVoiceTestScalarFieldEnum = (typeof TtsVoiceTestScalarFieldEnum)[keyof typeof TtsVoiceTestScalarFieldEnum]


  export const TtsEventScalarFieldEnum: {
    eventId: 'eventId',
    audioContent: 'audioContent',
    createdAt: 'createdAt'
  };

  export type TtsEventScalarFieldEnum = (typeof TtsEventScalarFieldEnum)[keyof typeof TtsEventScalarFieldEnum]


  export const TokenScalarFieldEnum: {
    tokenHash: 'tokenHash',
    name: 'name',
    scope: 'scope',
    expiresAt: 'expiresAt',
    revokedAt: 'revokedAt',
    createdAt: 'createdAt',
    Id: 'Id'
  };

  export type TokenScalarFieldEnum = (typeof TokenScalarFieldEnum)[keyof typeof TokenScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Bytes'
   */
  export type BytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes'>
    


  /**
   * Reference to a field of type 'Bytes[]'
   */
  export type ListBytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes[]'>
    


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'BigInt[]'
   */
  export type ListBigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt[]'>
    
  /**
   * Deep Input Types
   */


  export type TtsDailyUsageWhereInput = {
    AND?: TtsDailyUsageWhereInput | TtsDailyUsageWhereInput[]
    OR?: TtsDailyUsageWhereInput[]
    NOT?: TtsDailyUsageWhereInput | TtsDailyUsageWhereInput[]
    id?: IntFilter<"TtsDailyUsage"> | number
    date?: DateTimeFilter<"TtsDailyUsage"> | Date | string
    chars?: IntFilter<"TtsDailyUsage"> | number
    requests?: IntFilter<"TtsDailyUsage"> | number
  }

  export type TtsDailyUsageOrderByWithRelationInput = {
    id?: SortOrder
    date?: SortOrder
    chars?: SortOrder
    requests?: SortOrder
  }

  export type TtsDailyUsageWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    date?: Date | string
    AND?: TtsDailyUsageWhereInput | TtsDailyUsageWhereInput[]
    OR?: TtsDailyUsageWhereInput[]
    NOT?: TtsDailyUsageWhereInput | TtsDailyUsageWhereInput[]
    chars?: IntFilter<"TtsDailyUsage"> | number
    requests?: IntFilter<"TtsDailyUsage"> | number
  }, "id" | "date">

  export type TtsDailyUsageOrderByWithAggregationInput = {
    id?: SortOrder
    date?: SortOrder
    chars?: SortOrder
    requests?: SortOrder
    _count?: TtsDailyUsageCountOrderByAggregateInput
    _avg?: TtsDailyUsageAvgOrderByAggregateInput
    _max?: TtsDailyUsageMaxOrderByAggregateInput
    _min?: TtsDailyUsageMinOrderByAggregateInput
    _sum?: TtsDailyUsageSumOrderByAggregateInput
  }

  export type TtsDailyUsageScalarWhereWithAggregatesInput = {
    AND?: TtsDailyUsageScalarWhereWithAggregatesInput | TtsDailyUsageScalarWhereWithAggregatesInput[]
    OR?: TtsDailyUsageScalarWhereWithAggregatesInput[]
    NOT?: TtsDailyUsageScalarWhereWithAggregatesInput | TtsDailyUsageScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TtsDailyUsage"> | number
    date?: DateTimeWithAggregatesFilter<"TtsDailyUsage"> | Date | string
    chars?: IntWithAggregatesFilter<"TtsDailyUsage"> | number
    requests?: IntWithAggregatesFilter<"TtsDailyUsage"> | number
  }

  export type TtsWeekVoiceWhereInput = {
    AND?: TtsWeekVoiceWhereInput | TtsWeekVoiceWhereInput[]
    OR?: TtsWeekVoiceWhereInput[]
    NOT?: TtsWeekVoiceWhereInput | TtsWeekVoiceWhereInput[]
    id?: IntFilter<"TtsWeekVoice"> | number
    year?: IntFilter<"TtsWeekVoice"> | number
    week?: IntFilter<"TtsWeekVoice"> | number
    voiceName?: StringFilter<"TtsWeekVoice"> | string
    createdAt?: DateTimeFilter<"TtsWeekVoice"> | Date | string
  }

  export type TtsWeekVoiceOrderByWithRelationInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsWeekVoiceWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    year_week?: TtsWeekVoiceYearWeekCompoundUniqueInput
    AND?: TtsWeekVoiceWhereInput | TtsWeekVoiceWhereInput[]
    OR?: TtsWeekVoiceWhereInput[]
    NOT?: TtsWeekVoiceWhereInput | TtsWeekVoiceWhereInput[]
    year?: IntFilter<"TtsWeekVoice"> | number
    week?: IntFilter<"TtsWeekVoice"> | number
    voiceName?: StringFilter<"TtsWeekVoice"> | string
    createdAt?: DateTimeFilter<"TtsWeekVoice"> | Date | string
  }, "id" | "year_week">

  export type TtsWeekVoiceOrderByWithAggregationInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    createdAt?: SortOrder
    _count?: TtsWeekVoiceCountOrderByAggregateInput
    _avg?: TtsWeekVoiceAvgOrderByAggregateInput
    _max?: TtsWeekVoiceMaxOrderByAggregateInput
    _min?: TtsWeekVoiceMinOrderByAggregateInput
    _sum?: TtsWeekVoiceSumOrderByAggregateInput
  }

  export type TtsWeekVoiceScalarWhereWithAggregatesInput = {
    AND?: TtsWeekVoiceScalarWhereWithAggregatesInput | TtsWeekVoiceScalarWhereWithAggregatesInput[]
    OR?: TtsWeekVoiceScalarWhereWithAggregatesInput[]
    NOT?: TtsWeekVoiceScalarWhereWithAggregatesInput | TtsWeekVoiceScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TtsWeekVoice"> | number
    year?: IntWithAggregatesFilter<"TtsWeekVoice"> | number
    week?: IntWithAggregatesFilter<"TtsWeekVoice"> | number
    voiceName?: StringWithAggregatesFilter<"TtsWeekVoice"> | string
    createdAt?: DateTimeWithAggregatesFilter<"TtsWeekVoice"> | Date | string
  }

  export type TtsSettingsWhereInput = {
    AND?: TtsSettingsWhereInput | TtsSettingsWhereInput[]
    OR?: TtsSettingsWhereInput[]
    NOT?: TtsSettingsWhereInput | TtsSettingsWhereInput[]
    id?: IntFilter<"TtsSettings"> | number
    rate?: FloatFilter<"TtsSettings"> | number
    volumeSound?: FloatFilter<"TtsSettings"> | number
    updatedAt?: DateTimeFilter<"TtsSettings"> | Date | string
  }

  export type TtsSettingsOrderByWithRelationInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsSettingsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: TtsSettingsWhereInput | TtsSettingsWhereInput[]
    OR?: TtsSettingsWhereInput[]
    NOT?: TtsSettingsWhereInput | TtsSettingsWhereInput[]
    rate?: FloatFilter<"TtsSettings"> | number
    volumeSound?: FloatFilter<"TtsSettings"> | number
    updatedAt?: DateTimeFilter<"TtsSettings"> | Date | string
  }, "id">

  export type TtsSettingsOrderByWithAggregationInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
    updatedAt?: SortOrder
    _count?: TtsSettingsCountOrderByAggregateInput
    _avg?: TtsSettingsAvgOrderByAggregateInput
    _max?: TtsSettingsMaxOrderByAggregateInput
    _min?: TtsSettingsMinOrderByAggregateInput
    _sum?: TtsSettingsSumOrderByAggregateInput
  }

  export type TtsSettingsScalarWhereWithAggregatesInput = {
    AND?: TtsSettingsScalarWhereWithAggregatesInput | TtsSettingsScalarWhereWithAggregatesInput[]
    OR?: TtsSettingsScalarWhereWithAggregatesInput[]
    NOT?: TtsSettingsScalarWhereWithAggregatesInput | TtsSettingsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TtsSettings"> | number
    rate?: FloatWithAggregatesFilter<"TtsSettings"> | number
    volumeSound?: FloatWithAggregatesFilter<"TtsSettings"> | number
    updatedAt?: DateTimeWithAggregatesFilter<"TtsSettings"> | Date | string
  }

  export type TtsVoiceOverrideWhereInput = {
    AND?: TtsVoiceOverrideWhereInput | TtsVoiceOverrideWhereInput[]
    OR?: TtsVoiceOverrideWhereInput[]
    NOT?: TtsVoiceOverrideWhereInput | TtsVoiceOverrideWhereInput[]
    id?: IntFilter<"TtsVoiceOverride"> | number
    year?: IntFilter<"TtsVoiceOverride"> | number
    week?: IntFilter<"TtsVoiceOverride"> | number
    voiceName?: StringFilter<"TtsVoiceOverride"> | string
    updatedAt?: DateTimeFilter<"TtsVoiceOverride"> | Date | string
  }

  export type TtsVoiceOverrideOrderByWithRelationInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsVoiceOverrideWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    year_week?: TtsVoiceOverrideYearWeekCompoundUniqueInput
    AND?: TtsVoiceOverrideWhereInput | TtsVoiceOverrideWhereInput[]
    OR?: TtsVoiceOverrideWhereInput[]
    NOT?: TtsVoiceOverrideWhereInput | TtsVoiceOverrideWhereInput[]
    year?: IntFilter<"TtsVoiceOverride"> | number
    week?: IntFilter<"TtsVoiceOverride"> | number
    voiceName?: StringFilter<"TtsVoiceOverride"> | string
    updatedAt?: DateTimeFilter<"TtsVoiceOverride"> | Date | string
  }, "id" | "year_week">

  export type TtsVoiceOverrideOrderByWithAggregationInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    updatedAt?: SortOrder
    _count?: TtsVoiceOverrideCountOrderByAggregateInput
    _avg?: TtsVoiceOverrideAvgOrderByAggregateInput
    _max?: TtsVoiceOverrideMaxOrderByAggregateInput
    _min?: TtsVoiceOverrideMinOrderByAggregateInput
    _sum?: TtsVoiceOverrideSumOrderByAggregateInput
  }

  export type TtsVoiceOverrideScalarWhereWithAggregatesInput = {
    AND?: TtsVoiceOverrideScalarWhereWithAggregatesInput | TtsVoiceOverrideScalarWhereWithAggregatesInput[]
    OR?: TtsVoiceOverrideScalarWhereWithAggregatesInput[]
    NOT?: TtsVoiceOverrideScalarWhereWithAggregatesInput | TtsVoiceOverrideScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TtsVoiceOverride"> | number
    year?: IntWithAggregatesFilter<"TtsVoiceOverride"> | number
    week?: IntWithAggregatesFilter<"TtsVoiceOverride"> | number
    voiceName?: StringWithAggregatesFilter<"TtsVoiceOverride"> | string
    updatedAt?: DateTimeWithAggregatesFilter<"TtsVoiceOverride"> | Date | string
  }

  export type NameDictionaryWhereInput = {
    AND?: NameDictionaryWhereInput | NameDictionaryWhereInput[]
    OR?: NameDictionaryWhereInput[]
    NOT?: NameDictionaryWhereInput | NameDictionaryWhereInput[]
    id?: IntFilter<"NameDictionary"> | number
    key?: StringFilter<"NameDictionary"> | string
    value?: StringFilter<"NameDictionary"> | string
    createdAt?: DateTimeFilter<"NameDictionary"> | Date | string
    updatedAt?: DateTimeFilter<"NameDictionary"> | Date | string
  }

  export type NameDictionaryOrderByWithRelationInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type NameDictionaryWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    key?: string
    AND?: NameDictionaryWhereInput | NameDictionaryWhereInput[]
    OR?: NameDictionaryWhereInput[]
    NOT?: NameDictionaryWhereInput | NameDictionaryWhereInput[]
    value?: StringFilter<"NameDictionary"> | string
    createdAt?: DateTimeFilter<"NameDictionary"> | Date | string
    updatedAt?: DateTimeFilter<"NameDictionary"> | Date | string
  }, "id" | "key">

  export type NameDictionaryOrderByWithAggregationInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: NameDictionaryCountOrderByAggregateInput
    _avg?: NameDictionaryAvgOrderByAggregateInput
    _max?: NameDictionaryMaxOrderByAggregateInput
    _min?: NameDictionaryMinOrderByAggregateInput
    _sum?: NameDictionarySumOrderByAggregateInput
  }

  export type NameDictionaryScalarWhereWithAggregatesInput = {
    AND?: NameDictionaryScalarWhereWithAggregatesInput | NameDictionaryScalarWhereWithAggregatesInput[]
    OR?: NameDictionaryScalarWhereWithAggregatesInput[]
    NOT?: NameDictionaryScalarWhereWithAggregatesInput | NameDictionaryScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"NameDictionary"> | number
    key?: StringWithAggregatesFilter<"NameDictionary"> | string
    value?: StringWithAggregatesFilter<"NameDictionary"> | string
    createdAt?: DateTimeWithAggregatesFilter<"NameDictionary"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"NameDictionary"> | Date | string
  }

  export type TtsVoiceTestWhereInput = {
    AND?: TtsVoiceTestWhereInput | TtsVoiceTestWhereInput[]
    OR?: TtsVoiceTestWhereInput[]
    NOT?: TtsVoiceTestWhereInput | TtsVoiceTestWhereInput[]
    id?: IntFilter<"TtsVoiceTest"> | number
    cacheKey?: StringFilter<"TtsVoiceTest"> | string
    voiceName?: StringFilter<"TtsVoiceTest"> | string
    rate?: FloatFilter<"TtsVoiceTest"> | number
    text?: StringFilter<"TtsVoiceTest"> | string
    audioMp3?: BytesFilter<"TtsVoiceTest"> | Bytes
    volumeSound?: FloatFilter<"TtsVoiceTest"> | number
    createdAt?: DateTimeFilter<"TtsVoiceTest"> | Date | string
  }

  export type TtsVoiceTestOrderByWithRelationInput = {
    id?: SortOrder
    cacheKey?: SortOrder
    voiceName?: SortOrder
    rate?: SortOrder
    text?: SortOrder
    audioMp3?: SortOrder
    volumeSound?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsVoiceTestWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    cacheKey?: string
    AND?: TtsVoiceTestWhereInput | TtsVoiceTestWhereInput[]
    OR?: TtsVoiceTestWhereInput[]
    NOT?: TtsVoiceTestWhereInput | TtsVoiceTestWhereInput[]
    voiceName?: StringFilter<"TtsVoiceTest"> | string
    rate?: FloatFilter<"TtsVoiceTest"> | number
    text?: StringFilter<"TtsVoiceTest"> | string
    audioMp3?: BytesFilter<"TtsVoiceTest"> | Bytes
    volumeSound?: FloatFilter<"TtsVoiceTest"> | number
    createdAt?: DateTimeFilter<"TtsVoiceTest"> | Date | string
  }, "id" | "cacheKey">

  export type TtsVoiceTestOrderByWithAggregationInput = {
    id?: SortOrder
    cacheKey?: SortOrder
    voiceName?: SortOrder
    rate?: SortOrder
    text?: SortOrder
    audioMp3?: SortOrder
    volumeSound?: SortOrder
    createdAt?: SortOrder
    _count?: TtsVoiceTestCountOrderByAggregateInput
    _avg?: TtsVoiceTestAvgOrderByAggregateInput
    _max?: TtsVoiceTestMaxOrderByAggregateInput
    _min?: TtsVoiceTestMinOrderByAggregateInput
    _sum?: TtsVoiceTestSumOrderByAggregateInput
  }

  export type TtsVoiceTestScalarWhereWithAggregatesInput = {
    AND?: TtsVoiceTestScalarWhereWithAggregatesInput | TtsVoiceTestScalarWhereWithAggregatesInput[]
    OR?: TtsVoiceTestScalarWhereWithAggregatesInput[]
    NOT?: TtsVoiceTestScalarWhereWithAggregatesInput | TtsVoiceTestScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TtsVoiceTest"> | number
    cacheKey?: StringWithAggregatesFilter<"TtsVoiceTest"> | string
    voiceName?: StringWithAggregatesFilter<"TtsVoiceTest"> | string
    rate?: FloatWithAggregatesFilter<"TtsVoiceTest"> | number
    text?: StringWithAggregatesFilter<"TtsVoiceTest"> | string
    audioMp3?: BytesWithAggregatesFilter<"TtsVoiceTest"> | Bytes
    volumeSound?: FloatWithAggregatesFilter<"TtsVoiceTest"> | number
    createdAt?: DateTimeWithAggregatesFilter<"TtsVoiceTest"> | Date | string
  }

  export type ttsEventWhereInput = {
    AND?: ttsEventWhereInput | ttsEventWhereInput[]
    OR?: ttsEventWhereInput[]
    NOT?: ttsEventWhereInput | ttsEventWhereInput[]
    eventId?: StringFilter<"ttsEvent"> | string
    audioContent?: BytesNullableFilter<"ttsEvent"> | Bytes | null
    createdAt?: DateTimeFilter<"ttsEvent"> | Date | string
  }

  export type ttsEventOrderByWithRelationInput = {
    eventId?: SortOrder
    audioContent?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type ttsEventWhereUniqueInput = Prisma.AtLeast<{
    eventId?: string
    AND?: ttsEventWhereInput | ttsEventWhereInput[]
    OR?: ttsEventWhereInput[]
    NOT?: ttsEventWhereInput | ttsEventWhereInput[]
    audioContent?: BytesNullableFilter<"ttsEvent"> | Bytes | null
    createdAt?: DateTimeFilter<"ttsEvent"> | Date | string
  }, "eventId">

  export type ttsEventOrderByWithAggregationInput = {
    eventId?: SortOrder
    audioContent?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ttsEventCountOrderByAggregateInput
    _max?: ttsEventMaxOrderByAggregateInput
    _min?: ttsEventMinOrderByAggregateInput
  }

  export type ttsEventScalarWhereWithAggregatesInput = {
    AND?: ttsEventScalarWhereWithAggregatesInput | ttsEventScalarWhereWithAggregatesInput[]
    OR?: ttsEventScalarWhereWithAggregatesInput[]
    NOT?: ttsEventScalarWhereWithAggregatesInput | ttsEventScalarWhereWithAggregatesInput[]
    eventId?: StringWithAggregatesFilter<"ttsEvent"> | string
    audioContent?: BytesNullableWithAggregatesFilter<"ttsEvent"> | Bytes | null
    createdAt?: DateTimeWithAggregatesFilter<"ttsEvent"> | Date | string
  }

  export type tokenWhereInput = {
    AND?: tokenWhereInput | tokenWhereInput[]
    OR?: tokenWhereInput[]
    NOT?: tokenWhereInput | tokenWhereInput[]
    tokenHash?: StringFilter<"token"> | string
    name?: StringFilter<"token"> | string
    scope?: StringNullableFilter<"token"> | string | null
    expiresAt?: DateTimeFilter<"token"> | Date | string
    revokedAt?: StringNullableFilter<"token"> | string | null
    createdAt?: DateTimeFilter<"token"> | Date | string
    Id?: BigIntFilter<"token"> | bigint | number
  }

  export type tokenOrderByWithRelationInput = {
    tokenHash?: SortOrder
    name?: SortOrder
    scope?: SortOrderInput | SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    Id?: SortOrder
  }

  export type tokenWhereUniqueInput = Prisma.AtLeast<{
    tokenHash?: string
    Id?: bigint | number
    AND?: tokenWhereInput | tokenWhereInput[]
    OR?: tokenWhereInput[]
    NOT?: tokenWhereInput | tokenWhereInput[]
    name?: StringFilter<"token"> | string
    scope?: StringNullableFilter<"token"> | string | null
    expiresAt?: DateTimeFilter<"token"> | Date | string
    revokedAt?: StringNullableFilter<"token"> | string | null
    createdAt?: DateTimeFilter<"token"> | Date | string
  }, "Id" | "tokenHash">

  export type tokenOrderByWithAggregationInput = {
    tokenHash?: SortOrder
    name?: SortOrder
    scope?: SortOrderInput | SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    Id?: SortOrder
    _count?: tokenCountOrderByAggregateInput
    _avg?: tokenAvgOrderByAggregateInput
    _max?: tokenMaxOrderByAggregateInput
    _min?: tokenMinOrderByAggregateInput
    _sum?: tokenSumOrderByAggregateInput
  }

  export type tokenScalarWhereWithAggregatesInput = {
    AND?: tokenScalarWhereWithAggregatesInput | tokenScalarWhereWithAggregatesInput[]
    OR?: tokenScalarWhereWithAggregatesInput[]
    NOT?: tokenScalarWhereWithAggregatesInput | tokenScalarWhereWithAggregatesInput[]
    tokenHash?: StringWithAggregatesFilter<"token"> | string
    name?: StringWithAggregatesFilter<"token"> | string
    scope?: StringNullableWithAggregatesFilter<"token"> | string | null
    expiresAt?: DateTimeWithAggregatesFilter<"token"> | Date | string
    revokedAt?: StringNullableWithAggregatesFilter<"token"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"token"> | Date | string
    Id?: BigIntWithAggregatesFilter<"token"> | bigint | number
  }

  export type TtsDailyUsageCreateInput = {
    date: Date | string
    chars?: number
    requests?: number
  }

  export type TtsDailyUsageUncheckedCreateInput = {
    id?: number
    date: Date | string
    chars?: number
    requests?: number
  }

  export type TtsDailyUsageUpdateInput = {
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    chars?: IntFieldUpdateOperationsInput | number
    requests?: IntFieldUpdateOperationsInput | number
  }

  export type TtsDailyUsageUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    chars?: IntFieldUpdateOperationsInput | number
    requests?: IntFieldUpdateOperationsInput | number
  }

  export type TtsDailyUsageCreateManyInput = {
    id?: number
    date: Date | string
    chars?: number
    requests?: number
  }

  export type TtsDailyUsageUpdateManyMutationInput = {
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    chars?: IntFieldUpdateOperationsInput | number
    requests?: IntFieldUpdateOperationsInput | number
  }

  export type TtsDailyUsageUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    chars?: IntFieldUpdateOperationsInput | number
    requests?: IntFieldUpdateOperationsInput | number
  }

  export type TtsWeekVoiceCreateInput = {
    year: number
    week: number
    voiceName: string
    createdAt?: Date | string
  }

  export type TtsWeekVoiceUncheckedCreateInput = {
    id?: number
    year: number
    week: number
    voiceName: string
    createdAt?: Date | string
  }

  export type TtsWeekVoiceUpdateInput = {
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsWeekVoiceUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsWeekVoiceCreateManyInput = {
    id?: number
    year: number
    week: number
    voiceName: string
    createdAt?: Date | string
  }

  export type TtsWeekVoiceUpdateManyMutationInput = {
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsWeekVoiceUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsSettingsCreateInput = {
    rate?: number
    volumeSound?: number
    updatedAt?: Date | string
  }

  export type TtsSettingsUncheckedCreateInput = {
    id?: number
    rate?: number
    volumeSound?: number
    updatedAt?: Date | string
  }

  export type TtsSettingsUpdateInput = {
    rate?: FloatFieldUpdateOperationsInput | number
    volumeSound?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsSettingsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    rate?: FloatFieldUpdateOperationsInput | number
    volumeSound?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsSettingsCreateManyInput = {
    id?: number
    rate?: number
    volumeSound?: number
    updatedAt?: Date | string
  }

  export type TtsSettingsUpdateManyMutationInput = {
    rate?: FloatFieldUpdateOperationsInput | number
    volumeSound?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsSettingsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    rate?: FloatFieldUpdateOperationsInput | number
    volumeSound?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceOverrideCreateInput = {
    year: number
    week: number
    voiceName: string
    updatedAt?: Date | string
  }

  export type TtsVoiceOverrideUncheckedCreateInput = {
    id?: number
    year: number
    week: number
    voiceName: string
    updatedAt?: Date | string
  }

  export type TtsVoiceOverrideUpdateInput = {
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceOverrideUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceOverrideCreateManyInput = {
    id?: number
    year: number
    week: number
    voiceName: string
    updatedAt?: Date | string
  }

  export type TtsVoiceOverrideUpdateManyMutationInput = {
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceOverrideUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    week?: IntFieldUpdateOperationsInput | number
    voiceName?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NameDictionaryCreateInput = {
    key: string
    value: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type NameDictionaryUncheckedCreateInput = {
    id?: number
    key: string
    value: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type NameDictionaryUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NameDictionaryUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NameDictionaryCreateManyInput = {
    id?: number
    key: string
    value: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type NameDictionaryUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NameDictionaryUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceTestCreateInput = {
    cacheKey: string
    voiceName: string
    rate?: number
    text: string
    audioMp3: Bytes
    volumeSound?: number
    createdAt?: Date | string
  }

  export type TtsVoiceTestUncheckedCreateInput = {
    id?: number
    cacheKey: string
    voiceName: string
    rate?: number
    text: string
    audioMp3: Bytes
    volumeSound?: number
    createdAt?: Date | string
  }

  export type TtsVoiceTestUpdateInput = {
    cacheKey?: StringFieldUpdateOperationsInput | string
    voiceName?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    audioMp3?: BytesFieldUpdateOperationsInput | Bytes
    volumeSound?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceTestUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    cacheKey?: StringFieldUpdateOperationsInput | string
    voiceName?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    audioMp3?: BytesFieldUpdateOperationsInput | Bytes
    volumeSound?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceTestCreateManyInput = {
    id?: number
    cacheKey: string
    voiceName: string
    rate?: number
    text: string
    audioMp3: Bytes
    volumeSound?: number
    createdAt?: Date | string
  }

  export type TtsVoiceTestUpdateManyMutationInput = {
    cacheKey?: StringFieldUpdateOperationsInput | string
    voiceName?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    audioMp3?: BytesFieldUpdateOperationsInput | Bytes
    volumeSound?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TtsVoiceTestUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    cacheKey?: StringFieldUpdateOperationsInput | string
    voiceName?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    audioMp3?: BytesFieldUpdateOperationsInput | Bytes
    volumeSound?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ttsEventCreateInput = {
    eventId: string
    audioContent?: Bytes | null
    createdAt?: Date | string
  }

  export type ttsEventUncheckedCreateInput = {
    eventId: string
    audioContent?: Bytes | null
    createdAt?: Date | string
  }

  export type ttsEventUpdateInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    audioContent?: NullableBytesFieldUpdateOperationsInput | Bytes | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ttsEventUncheckedUpdateInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    audioContent?: NullableBytesFieldUpdateOperationsInput | Bytes | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ttsEventCreateManyInput = {
    eventId: string
    audioContent?: Bytes | null
    createdAt?: Date | string
  }

  export type ttsEventUpdateManyMutationInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    audioContent?: NullableBytesFieldUpdateOperationsInput | Bytes | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ttsEventUncheckedUpdateManyInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    audioContent?: NullableBytesFieldUpdateOperationsInput | Bytes | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type tokenCreateInput = {
    tokenHash: string
    name: string
    scope?: string | null
    expiresAt: Date | string
    revokedAt?: string | null
    createdAt?: Date | string
    Id?: bigint | number
  }

  export type tokenUncheckedCreateInput = {
    tokenHash: string
    name: string
    scope?: string | null
    expiresAt: Date | string
    revokedAt?: string | null
    createdAt?: Date | string
    Id?: bigint | number
  }

  export type tokenUpdateInput = {
    tokenHash?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Id?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type tokenUncheckedUpdateInput = {
    tokenHash?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Id?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type tokenCreateManyInput = {
    tokenHash: string
    name: string
    scope?: string | null
    expiresAt: Date | string
    revokedAt?: string | null
    createdAt?: Date | string
    Id?: bigint | number
  }

  export type tokenUpdateManyMutationInput = {
    tokenHash?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Id?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type tokenUncheckedUpdateManyInput = {
    tokenHash?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Id?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type TtsDailyUsageCountOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    chars?: SortOrder
    requests?: SortOrder
  }

  export type TtsDailyUsageAvgOrderByAggregateInput = {
    id?: SortOrder
    chars?: SortOrder
    requests?: SortOrder
  }

  export type TtsDailyUsageMaxOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    chars?: SortOrder
    requests?: SortOrder
  }

  export type TtsDailyUsageMinOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    chars?: SortOrder
    requests?: SortOrder
  }

  export type TtsDailyUsageSumOrderByAggregateInput = {
    id?: SortOrder
    chars?: SortOrder
    requests?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type TtsWeekVoiceYearWeekCompoundUniqueInput = {
    year: number
    week: number
  }

  export type TtsWeekVoiceCountOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsWeekVoiceAvgOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
  }

  export type TtsWeekVoiceMaxOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsWeekVoiceMinOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsWeekVoiceSumOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type TtsSettingsCountOrderByAggregateInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsSettingsAvgOrderByAggregateInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
  }

  export type TtsSettingsMaxOrderByAggregateInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsSettingsMinOrderByAggregateInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsSettingsSumOrderByAggregateInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type TtsVoiceOverrideYearWeekCompoundUniqueInput = {
    year: number
    week: number
  }

  export type TtsVoiceOverrideCountOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsVoiceOverrideAvgOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
  }

  export type TtsVoiceOverrideMaxOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsVoiceOverrideMinOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
    voiceName?: SortOrder
    updatedAt?: SortOrder
  }

  export type TtsVoiceOverrideSumOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    week?: SortOrder
  }

  export type NameDictionaryCountOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type NameDictionaryAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type NameDictionaryMaxOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type NameDictionaryMinOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type NameDictionarySumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type BytesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Bytes
  }

  export type TtsVoiceTestCountOrderByAggregateInput = {
    id?: SortOrder
    cacheKey?: SortOrder
    voiceName?: SortOrder
    rate?: SortOrder
    text?: SortOrder
    audioMp3?: SortOrder
    volumeSound?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsVoiceTestAvgOrderByAggregateInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
  }

  export type TtsVoiceTestMaxOrderByAggregateInput = {
    id?: SortOrder
    cacheKey?: SortOrder
    voiceName?: SortOrder
    rate?: SortOrder
    text?: SortOrder
    audioMp3?: SortOrder
    volumeSound?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsVoiceTestMinOrderByAggregateInput = {
    id?: SortOrder
    cacheKey?: SortOrder
    voiceName?: SortOrder
    rate?: SortOrder
    text?: SortOrder
    audioMp3?: SortOrder
    volumeSound?: SortOrder
    createdAt?: SortOrder
  }

  export type TtsVoiceTestSumOrderByAggregateInput = {
    id?: SortOrder
    rate?: SortOrder
    volumeSound?: SortOrder
  }

  export type BytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Bytes
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type BytesNullableFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel> | null
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    not?: NestedBytesNullableFilter<$PrismaModel> | Bytes | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ttsEventCountOrderByAggregateInput = {
    eventId?: SortOrder
    audioContent?: SortOrder
    createdAt?: SortOrder
  }

  export type ttsEventMaxOrderByAggregateInput = {
    eventId?: SortOrder
    audioContent?: SortOrder
    createdAt?: SortOrder
  }

  export type ttsEventMinOrderByAggregateInput = {
    eventId?: SortOrder
    audioContent?: SortOrder
    createdAt?: SortOrder
  }

  export type BytesNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel> | null
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    not?: NestedBytesNullableWithAggregatesFilter<$PrismaModel> | Bytes | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBytesNullableFilter<$PrismaModel>
    _max?: NestedBytesNullableFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type tokenCountOrderByAggregateInput = {
    tokenHash?: SortOrder
    name?: SortOrder
    scope?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrder
    createdAt?: SortOrder
    Id?: SortOrder
  }

  export type tokenAvgOrderByAggregateInput = {
    Id?: SortOrder
  }

  export type tokenMaxOrderByAggregateInput = {
    tokenHash?: SortOrder
    name?: SortOrder
    scope?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrder
    createdAt?: SortOrder
    Id?: SortOrder
  }

  export type tokenMinOrderByAggregateInput = {
    tokenHash?: SortOrder
    name?: SortOrder
    scope?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrder
    createdAt?: SortOrder
    Id?: SortOrder
  }

  export type tokenSumOrderByAggregateInput = {
    Id?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BytesFieldUpdateOperationsInput = {
    set?: Bytes
  }

  export type NullableBytesFieldUpdateOperationsInput = {
    set?: Bytes | null
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedBytesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Bytes
  }

  export type NestedBytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Bytes
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type NestedBytesNullableFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel> | null
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    not?: NestedBytesNullableFilter<$PrismaModel> | Bytes | null
  }

  export type NestedBytesNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel> | null
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel> | null
    not?: NestedBytesNullableWithAggregatesFilter<$PrismaModel> | Bytes | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBytesNullableFilter<$PrismaModel>
    _max?: NestedBytesNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}