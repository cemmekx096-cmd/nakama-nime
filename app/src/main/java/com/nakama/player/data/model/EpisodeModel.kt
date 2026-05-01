package com.nakama.player.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index

/**
 * Model episode anime.
 * Opsional — dipakai kalau kita cache episode list.
 * Tidak wajib di-cache, bisa selalu fetch dari extension.
 */
@Entity(
    tableName = "episode",
    primaryKeys = ["episodeId", "pkg"],
    indices = [
        Index(value = ["animeId", "pkg"]),
        Index(value = ["number"])
    ]
)
data class EpisodeModel(
    val episodeId:  String,  // ID unik episode dari source
    val animeId:    String,  // ID anime parent
    val pkg:        String,  // extension package
    val number:     Float,   // Float untuk support ep 1.5, 2.5 (recap/special)
    val title:      String  = "",
    val thumbnailUrl: String = "",
    val duration:   Long    = 0L,   // detik
    val uploadedAt: String  = "",
    val cachedAt:   Long    = System.currentTimeMillis()
)
