import { resolve } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";
import { VERSION } from "./version";
const beginPKCS1 = "-----BEGIN RSA PRIVATE KEY-----";
const endPKCS1 = "-----END RSA PRIVATE KEY-----";
const beginPKCS8 = "-----BEGIN PRIVATE KEY-----";
const endPKCS8 = "-----END PRIVATE KEY-----";
function isPkcs1(privateKey) {
  return privateKey.includes(beginPKCS1) && privateKey.includes(endPKCS1);
}
function isPkcs8(privateKey) {
  return privateKey.includes(beginPKCS8) && privateKey.includes(endPKCS8);
}
function getPrivateKey(options = {}) {
  const env = options.env || process.env;
  const cwd = options.cwd || process.cwd();
  if (options.filepath) {
    return readFileSync(resolve(cwd, options.filepath), "utf-8");
  }
  if (env.PRIVATE_KEY) {
    let privateKey = env.PRIVATE_KEY;
    if (isBase64(privateKey)) {
      privateKey = Buffer.from(privateKey, "base64").toString();
    }
    if (isPkcs1(privateKey) || isPkcs8(privateKey)) {
      if (privateKey.indexOf("\\n") !== -1) {
        privateKey = privateKey.replace(/\\n/g, "\n");
      }
      if (privateKey.indexOf("\n") === -1) {
        privateKey = addNewlines({
          privateKey,
          begin: isPkcs1(privateKey) ? beginPKCS1 : beginPKCS8,
          end: isPkcs1(privateKey) ? endPKCS1 : endPKCS8
        });
      }
      return privateKey;
    }
    throw new Error(
      `[@probot/get-private-key] The contents of "env.PRIVATE_KEY" could not be validated. Please check to ensure you have copied the contents of the .pem file correctly.`
    );
  }
  if (env.PRIVATE_KEY_PATH) {
    const filepath = resolve(cwd, env.PRIVATE_KEY_PATH);
    if (existsSync(filepath)) {
      return readFileSync(filepath, "utf-8");
    } else {
      throw new Error(
        `[@probot/get-private-key] Private key does not exists at path: "${env.PRIVATE_KEY_PATH}". Please check to ensure that "env.PRIVATE_KEY_PATH" is correct.`
      );
    }
  }
  const pemFiles = readdirSync(cwd).filter((path) => path.endsWith(".pem"));
  if (pemFiles.length > 1) {
    const paths = pemFiles.join(", ");
    throw new Error(
      `[@probot/get-private-key] More than one file found: "${paths}". Set { filepath } option or set one of the environment variables: PRIVATE_KEY, PRIVATE_KEY_PATH`
    );
  } else if (pemFiles[0]) {
    return getPrivateKey({ filepath: pemFiles[0], cwd });
  }
  return null;
}
function isBase64(str) {
  return Buffer.from(str, "base64").toString("base64") === str;
}
function addNewlines({
  privateKey,
  begin,
  end
}) {
  const middleLength = privateKey.length - begin.length - end.length - 2;
  const middle = privateKey.substr(begin.length + 1, middleLength);
  return `${begin}
${middle.trim().replace(/\s+/g, "\n")}
${end}`;
}
getPrivateKey.VERSION = VERSION;
export {
  getPrivateKey
};