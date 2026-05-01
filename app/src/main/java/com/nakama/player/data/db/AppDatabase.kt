package com.nakama.player.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.nakama.player.data.model.AnimeModel
import com.nakama.player.data.model.EpisodeModel
import com.nakama.player.data.model.ExtensionModel
import com.nakama.player.data.model.ProgressModel

/**
 * Room database Nakama.
 * Singleton — satu instance selama app hidup.
 * Versi database di-increment setiap ada perubahan schema.
 */
@Database(
    entities = [
        AnimeModel::class,
        EpisodeModel::class,
        ProgressModel::class,
        ExtensionModel::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun animeDao(): AnimeDao
    abstract fun episodeDao(): EpisodeDao
    abstract fun progressDao(): ProgressDao
    abstract fun extensionDao(): ExtensionDao

    companion object {
        private const val DB_NAME = "nakama.db"

        @Volatile
        private var instance: AppDatabase? = null

        /**
         * Singleton getInstance — thread safe via double-checked locking.
         */
        fun getInstance(context: Context): AppDatabase {
            return instance ?: synchronized(this) {
                instance ?: buildDatabase(context).also { instance = it }
            }
        }

        private fun buildDatabase(context: Context): AppDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                DB_NAME
            )
            .fallbackToDestructiveMigration() // reset DB kalau versi naik tanpa migration
            .build()
        }
    }
}
