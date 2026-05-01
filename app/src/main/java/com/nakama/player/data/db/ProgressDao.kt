package com.nakama.player.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.nakama.player.data.model.ProgressModel

@Dao
interface ProgressDao {

    // ─── UPSERT ───────────────────────────────

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(progress: ProgressModel)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(list: List<ProgressModel>)

    // ─── GET ──────────────────────────────────

    @Query("""
        SELECT * FROM progress 
        WHERE episodeId = :episodeId
    """)
    suspend fun get(episodeId: String): ProgressModel?

    /**
     * Ambil semua progress untuk backup.
     */
    @Query("SELECT * FROM progress")
    suspend fun getAll(): List<ProgressModel>

    /**
     * Ambil episode terakhir yang ditonton untuk anime tertentu.
     * Dipakai tombol Play otomatis.
     */
    @Query("""
        SELECT * FROM progress 
        WHERE animeId = :animeId AND pkg = :pkg
        ORDER BY lastWatched DESC
        LIMIT 1
    """)
    suspend fun getLastWatched(animeId: String, pkg: String): ProgressModel?

    /**
     * Ambil semua episodeId yang sudah selesai ditonton.
     * Dipakai untuk warnai episode list di UI.
     */
    @Query("""
        SELECT episodeId FROM progress 
        WHERE animeId = :animeId 
        AND pkg = :pkg 
        AND completed = 1
    """)
    suspend fun getWatchedEpisodeIds(animeId: String, pkg: String): List<String>

    // ─── DELETE ───────────────────────────────

    @Query("""
        DELETE FROM progress 
        WHERE animeId = :animeId AND pkg = :pkg
    """)
    suspend fun deleteByAnime(animeId: String, pkg: String)

    @Query("DELETE FROM progress")
    suspend fun deleteAll()
}
