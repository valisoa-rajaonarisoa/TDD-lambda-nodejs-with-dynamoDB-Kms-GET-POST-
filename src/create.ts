import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DecryptCommand, EncryptCommand, KMSClient } from "@aws-sdk/client-kms";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
//islocal
const IS_LOCAL = process.env.IS_LOCAL === "true";

//REGION
const REGION = "eu-west-1";

//creation du client

const clientConfig = IS_LOCAL
  ? {
      region: "us-east-1",
      endpoint: "http://localhost:4566", // LocalStack pour simuler AWS localement
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    }
  : { region: REGION }; //en prod , si non en localStack

//CREATion de client pour chaque services
const dynamodbClient = new DynamoDBClient(clientConfig);
const kmsClient = new KMSClient(clientConfig);

// Nom de la table et clé KMS (peut être différente en prod)
const TABLE_NAME = "users";
const KMS_KEY_ID = "alias/localstack-key"; // Clé KMS fictive en local

// Fonction pour chiffrer les données
async function encryptData(plaintext: string): Promise<Uint8Array> {
  if (IS_LOCAL) {
    // En local on ne chiffre pas vraiment, juste encodage texte → binaire
    return Buffer.from(plaintext, "utf-8");
  } else {
    // En prod, on utilise KMS pour chiffrer
    const result = await kmsClient.send(
      new EncryptCommand({
        KeyId: KMS_KEY_ID,
        Plaintext: Buffer.from(plaintext, "utf-8"),
      })
    );
    return result.CiphertextBlob!;
  }
}

// Fonction pour déchiffrer les données
async function decryptData(ciphertext: Uint8Array): Promise<string> {
  if (IS_LOCAL) {
    // En local, on ne déchiffre pas vraiment
    return Buffer.from(ciphertext).toString("utf-8");
  } else {
    // En prod, on déchiffre avec KMS
    const result = await kmsClient.send(
      new DecryptCommand({
        CiphertextBlob: ciphertext,
      })
    );
    return Buffer.from(result.Plaintext!).toString("utf-8");
  }
}

export const handlers = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};

    if (!body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "champ invalide" }),
      };
    }

    //chiffrement des datas

    const nameEncrypt = await encryptData(body.name);
    const emailEncrypt = await encryptData(body.email);

    //enregistrement

    await dynamodbClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: body.id },
          name: { B: nameEncrypt }, //B= binary
          email: { B: emailEncrypt },
        },
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "user cree", id: body.id }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "une erreur est survenu" }),
    };
  }
};
