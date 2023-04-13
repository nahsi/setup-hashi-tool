const core = require("@actions/core");
const exec = require("@actions/exec");
const tc = require("@actions/tool-cache");
const fs = require("fs");
const axios = require("axios");
const semver = require("semver");

const osArchMapping = {
  "macos": {
    "x64": "darwin_amd64",
    "arm64": "darwin_arm64",
  },
  "linux": {
    "x64": "linux_amd64",
    "arm64": "linux_arm64",
  },
};

function getArchitecture(runnerOS, arch) {
  if (
    osArchMapping.hasOwnProperty(runnerOS) &&
    osArchMapping[runnerOS].hasOwnProperty(arch)
  ) {
    return osArchMapping[runnerOS][arch];
  }

  core.setFailed(`${runnerOS} with architecture ${arch} is not supported yet`);
  return null;
}

async function run() {
  try {
    let version = core.getInput("version");
    const toolName = core.getInput("name");
    const runnerOS = process.env.RUNNER_OS.toLowerCase();
    const runnerArch = process.arch;

    const architecture = getArchitecture(runnerOS, runnerArch);
    if (!architecture) {
      return;
    }

    if (version.toLowerCase() === "latest") {
      core.info("Fetching latest version");
      const response = await axios.get(
        `https://releases.hashicorp.com/${toolName}/index.json`,
      );
      const nonEnterpriseVersions = Object.keys(response.data.versions)
        .filter((version) =>
          !version.includes("+ent") && semver.valid(version)
        );

      const latestVersion = nonEnterpriseVersions.sort(semver.rcompare)[0];

      version = latestVersion;
    } else {
      version = version.replace(/^v/, "");
    }

    let toolPath = tc.find(toolName, version, architecture);

    if (!toolPath) {
      const zipFilename = `${toolName}_${version}_${architecture}.zip`;
      const downloadUrl =
        `https://releases.hashicorp.com/${toolName}/${version}/${zipFilename}`;

      core.info(
        `Downloading ${toolName} version ${version} for ${architecture}`,
      );
      const downloadPath = await tc.downloadTool(downloadUrl);

      core.info("Extracting the downloaded archive");
      const extractPath = await tc.extractZip(downloadPath);

      core.info("Making the tool executable");
      fs.chmodSync(`${extractPath}/${toolName}`, "755");

      core.info("Caching the tool");
      toolPath = await tc.cacheDir(
        extractPath,
        toolName,
        version,
        architecture,
      );
    } else {
      core.info(`Using cached ${toolName} version ${version}`);
    }

    core.info('Adding the tool to PATH');
    core.addPath(toolPath);

    core.info("Checking installed version");
    await exec.exec(`${toolName}`, ["--version"]);

    core.info(
      `${toolName} v${version} has been set up successfully`,
    );

    core.info("Cleaning up residual files");
    await exec.exec("rm", ["-rf", downloadedPath]);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
