"use strict";

import { handlers } from "../src/get";

// *************importation services *********

import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

// #crypatage
import { DecryptCommand, EncryptCommand, KMSClient } from "@aws-sdk/client-kms";

// ***************maintenant on import le client-mock sdk , dont l'objectif est de mocker le client pour qu'on puisse l'utiliser dans dynamodb ou kms

import { mockClient } from "aws-sdk-client-mock";

import "aws-sdk-client-mock-jest"; //helper pour jest
import { describe } from "node:test";

//creation des client mocks pour chaque services

const ddbMock = mockClient(DynamoDBClient);

const kmsMock = mockClient(KMSClient);

describe("super test ", async () => {
  //renitialisation des services à chaque test
  beforeEach(() => {
    ddbMock.reset();
    kmsMock.reset();
  });

  //   ********************************GET USERS **********************
  test("GET ON USER", async () => {
    // 1  SIMULATION RESPONSES DES SERVICES Dynamo et KMS

    //dynamo GET ( retournez moi un object du genre item)
    ddbMock.on(GetItemCommand).resolves({
      Item: {
        PK: { S: "1234" },
        name: { B: expect.any(Buffer) },
        email: { B: expect.any(Buffer) },
      },
    });

    //mock Decryptage

    kmsMock.on(DecryptCommand).resolves({
      Plaintext: Buffer.from("test-data"),
    });

    // 2 SIMULATION EVENT POUR LE LAMBDA ET SON RESPONSE
    //event
    const event = {
      httpMethod: "GET",
      pathParameters: { id: "1234" },
      body: null,
    };
    //result
    const result = await handlers(event as any);
    //expect statusCode
    expect(result.statusCode).toBe(200);

    console.log("le result est ",result)

    //expect resuttat object
    expect(JSON.parse(result.body)).toEqual({
      PK: "1234",
      name: "test-data",
      email: "test-data",
    });

    // 3 DYNAMODB RESPONSES
    expect(ddbMock).toHaveReceivedCommandWith(GetItemCommand, {
      TableName: "users",
      Key: { PK: { S: "1234" } },
    });
  });
});
