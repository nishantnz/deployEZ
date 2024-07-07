const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const createProject = async (req, res) => {
  const { name, gitURL, subDomain, customDomain } = req.body;
  const user_id = req.user.id;
  try {
    const project = await prisma.project.create({
      data: {
        name,
        gitURL,
        subDomain,
        customDomain,
        createdById: user_id,
      },
    });
    res.status(201).json({
      status: "Project Created Successfully",
      status_code: 201,
      project_id: project.id,
    });
  } catch (error) {
    console.error("Error creating project: ", error);
    res.status(500).json({
      status: "Internal Server Error",
      status_code: 500,
      message: "An error occurred while creating the project",
    });
  }
};

module.exports = createProject;
