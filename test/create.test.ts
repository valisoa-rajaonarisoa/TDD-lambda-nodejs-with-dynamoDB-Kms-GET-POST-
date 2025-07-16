"use strict";

import { handlers } from "../src/create";

// *************importation services *********

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

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

  test("CREATE USERS", async () => {
    //simulation des responses
    //alors à chaque fois, qu'on appelle le EncryptCommand, ( tu ne l'envoye pas à AWS), mais tu vas juste le renvoyer qlq chso

    // kmsMock.on(EncryptCommand).resolves(
    // {
    //   CiphertextBlob: Buffer.from("encrypted-data") =======> RESPONSES ATTENDUE
    // ,
    // });

    kmsMock.on(EncryptCommand).resolves({
      CiphertextBlob: Buffer.from("encrypted-data"),
    });

    ddbMock.on(PutItemCommand).resolves({}); //retourne moi un object vide si on utilise PutItemCommand
    //simulation du function lambda
    //creation d'un faux event pour tester le lambda
    const event = {
      httpMethod: "POST",
      body: JSON.stringify({
        id: "1234",
        name: "john",
        email: "john@gmail.com",
      }),
      pathParameters: null,
    };

    //result => appeller la fonction lambda, comme traite aws
    const result = await handlers(event as any);

    //il doit retourner 201
    expect(result.statusCode).toBe(201);

    //result doit retourne aussi un objet {message:"", id:""}
    expect(JSON.parse(result.body)).toEqual({
      message: "user cree",
      id: "1234",
    });

    //verifier que dynamoDB a ete bien utilisé
    expect(ddbMock).toHaveReceivedCommandWith(PutItemCommand, {
      TableName: "users",
      Item: {
        PK: { S: "1234" },
        name: { B: expect.any(Buffer) },
        email: { B: expect.any(Buffer) },
      },
    });
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

    //expect resuttat object
    expect(JSON.parse(result.body)).toEqual({
      PK: "1234",
      name: "name",
      email: "email",
    });

    // 3 DYNAMODB RESPONSES
    expect(ddbMock).toHaveReceivedCommandWith(GetItemCommand, {
      TableName: "users",
      Key: { PK: { S: "1234" } },
    });
  });
});
