import { Router } from 'express';
import venueRoutes from './venueRoutes';
import lecturerRoutes from './lecturerRoutes';
import courseRoutes from './courseRoutes';
import studentGroupRoutes from './studentGroupRoutes';
import monitoringRoutes from './monitoringRoutes';
import { importRoutes } from './importRoutes';
import { matchReviewRoutes } from './matchReviewRoutes';
import templateRoutes from './templateRoutes';
import documentationRoutes from './documentationRoutes';

const router = Router();

// Mount venue routes
router.use('/venues', venueRoutes);

// Mount lecturer routes
router.use('/lecturers', lecturerRoutes);

// Mount course routes
router.use('/courses', courseRoutes);

// Mount student group routes
router.use('/student-groups', studentGroupRoutes);

// Mount import routes
router.use('/import', importRoutes);

// Mount match review routes
router.use('/match-review', matchReviewRoutes);

// Mount template routes
router.use('/templates', templateRoutes);

// Mount documentation routes
router.use('/documentation', documentationRoutes);

// Mount monitoring routes
router.use('/', monitoringRoutes);

export default router;