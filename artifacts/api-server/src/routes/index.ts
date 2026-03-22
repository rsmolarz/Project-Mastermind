import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import membersRouter from "./members";
import tasksRouter from "./tasks";
import sprintsRouter from "./sprints";
import timeEntriesRouter from "./time-entries";
import goalsRouter from "./goals";
import announcementsRouter from "./announcements";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(membersRouter);
router.use(tasksRouter);
router.use(sprintsRouter);
router.use(timeEntriesRouter);
router.use(goalsRouter);
router.use(announcementsRouter);
router.use(documentsRouter);
router.use(dashboardRouter);
router.use(aiRouter);

export default router;
