package com.nakama.player.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.nakama.player.data.model.AnimeModel

@Dao
interface AnimeDao {

    // ─── INSERT ───────────────────────────────

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(anime: AnimeModel)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(animes: List<AnimeModel>)

    // ─── LIBRARY ──────────────────────────────

    @Query("""
        SELECT * FROM anime 
        WHERE inLibrary = 1 
        ORDER BY addedAt DESC
    """)
    suspend fun getAll(): List<AnimeModel>

    @Query("""
        SELECT EXISTS(
            SELECT 1 FROM anime 
            WHERE animeId = :animeId AND pkg = :pkg
        )
    """)
    suspend fun exists(animeId: String, pkg: String): Boolean

    @Query("""
        UPDATE anime 
        SET inLibrary = 0 
        WHERE animeId = :animeId AND pkg = :pkg
    """)
    suspend fun delete(animeId: String, pkg: String)

    // ─── HISTORY ──────────────────────────────

    /**
     * Ambil anime yang pernah ditonton (lastWatchedAt > 0),
     * diurutkan dari yang terbaru.
     */
    @Query("""
        SELECT * FROM anime 
        WHERE lastWatchedAt > 0 
        ORDER BY lastWatchedAt DESC
    """)
    suspend fun getHistory(): List<AnimeModel>

    /**
     * Update lastWatchedAt saat user mulai tonton episode.
     */
    @Query("""
        UPDATE anime 
        SET lastWatchedAt = :timestamp 
        WHERE animeId = :animeId AND pkg = :pkg
    """)
    suspend fun updateLastWatched(animeId: String, pkg: String, timestamp: Long)

    // ─── SEARCH ───────────────────────────────

    @Query("""
        SELECT * FROM anime 
        WHERE inLibrary = 1 
        AND (title LIKE '%' || :query || '%')
        ORDER BY title ASC
    """)
    suspend fun searchLibrary(query: String): List<AnimeModel>
}
