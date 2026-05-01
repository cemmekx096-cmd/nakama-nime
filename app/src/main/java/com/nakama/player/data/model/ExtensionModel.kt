package com.nakama.player.data.model

import androidx.room.Entity
import androidx.room.Index

/**
 * Progress tonton per episode.
 * Di-update setiap 5 detik saat player aktif.
 */
@Entity(
    tableName = "progress",
    primaryKeys = ["episodeId", "pkg"],
    indices = [
        Index(value = ["animeId", "pkg"]),
        Index(value = ["lastWatched"]),
        Index(value = ["completed"])
    ]
)
data class ProgressModel(
    val episodeId:   String,
    val animeId:     String,
    val pkg:         String,
    val position:    Long    = 0L,   // posisi playback dalam detik
    val duration:    Long    = 0L,   // durasi total dalam detik
    val lastWatched: Long    = System.currentTimeMillis(),
    val completed:   Boolean = false // true kalau progress >= 90%
)
