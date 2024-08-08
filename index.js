import { Client } from "@elastic/elasticsearch";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Elasticsearch client configuration
const client = new Client({
  node: "http://localhost:3333",
  auth: {
    username: "elastic",
    password: process.env.ELASTIC_SEARCH,
  },
});

// Testing your Elasticsearch connection
client.ping()
  .then((res) => {
    console.log("Connection successful:", res);
  })
  .catch((err) => {
    console.error("Connection fail:", err);
  });

// AI client configuration
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to create indexes in Elasticsearch
const createIndices = async () => {
  try {
    await client.indices.create({
      index: "pets",
      body: {
        mappings: {
          properties: {
            document: {
              type: "text",
            },
            embedding: {
              type: "dense_vector",
              dims: 1536,
              index: true,
              similarity: "cosine",
            },
          },
        },
      },
    });
    console.log("Index created successfully.");
  } catch (err) {
    console.error("Error creating index:", err);
  }
};

// Function to create documents in Elasticsearch with Google Generative AI embeddings
const createIndexs = async () => {
  const documents = [
    "A cat is a domesticated animal that likes to sleep.",
    "A dog is a loyal companion that likes to play.",
    "A bird is a feathered creature that likes to fly.",
    "A fish is an aquatic animal that likes to swim.",
    "A lion is a wild animal that likes to hunt.",
  ];

  for (const [index, document] of documents.entries()) {
    try {
      const response = await model.generateContent([document]);
      const embedding = response[0].embedding; 

      await client.index({
        index: "pets",
        body: {
          document: document,
          embedding: embedding,
        },
      });

      console.log(`Document ${index} successfully indexed.`);
    } catch (err) {
      console.error("Failed to create embedding or index document:", err);
    }
  }
};

const query = async () => {
  try {
    const queryText = "What animal likes water?";
    const response = await model.generateContent([queryText]);
    const query_embedding = response[0].embedding; 

    const result = await client.search({
      index: "pets",
      body: {
        knn: {
          field: "embedding",
          query_vector: query_embedding,
          k: 5,
          num_candidates: 10,
        },
      },
    });

    const hits = result.hits.hits;
    hits.forEach((hit) => {
      console.log(hit._source.document);
      console.log(hit._score);
    });
  } catch (err) {
    console.error("Error when performing query:", err);
  }
};

const main = async () => {
  await createIndices();
  await createIndexs();
  await query();
};

main();
