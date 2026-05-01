package com.nakama.player.network

import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.dnsoverhttps.DnsOverHttps
import java.net.InetAddress

/**
 * DNS over HTTPS providers
 * Ported from Cloudstream3 & Tachiyomi
 */

fun OkHttpClient.Builder.addGenericDns(
    url: String,
    ips: List<String>
) = dns(
    DnsOverHttps.Builder()
        .client(build())
        .url(url.toHttpUrl())
        .bootstrapDnsHosts(ips.map { InetAddress.getByName(it) })
        .build()
)

fun OkHttpClient.Builder.addGoogleDns() = addGenericDns(
    "https://dns.google/dns-query",
    listOf("8.8.4.4", "8.8.8.8")
)

fun OkHttpClient.Builder.addCloudFlareDns() = addGenericDns(
    "https://cloudflare-dns.com/dns-query",
    listOf(
        "1.1.1.1",
        "1.0.0.1",
        "2606:4700:4700::1111",
        "2606:4700:4700::1001"
    )
)

fun OkHttpClient.Builder.addAdGuardDns() = addGenericDns(
    "https://dns.adguard.com/dns-query",
    listOf(
        "94.140.14.140",
        "94.140.14.141"
    )
)

fun OkHttpClient.Builder.addDNSWatchDns() = addGenericDns(
    "https://resolver2.dns.watch/dns-query",
    listOf(
        "84.200.69.80",
        "84.200.70.40"
    )
)

fun OkHttpClient.Builder.addQuad9Dns() = addGenericDns(
    "https://dns.quad9.net/dns-query",
    listOf(
        "9.9.9.9",
        "149.112.112.112"
    )
)

// Enum untuk settings UI
enum class DnsProvider(val id: Int, val displayName: String) {
    SYSTEM(0, "Sistem"),
    GOOGLE(1, "Google (8.8.8.8)"),
    CLOUDFLARE(2, "Cloudflare (1.1.1.1)"),
    ADGUARD(3, "AdGuard"),
    DNS_WATCH(4, "DNS.Watch"),
    QUAD9(5, "Quad9");

    companion object {
        fun fromId(id: Int) = entries.firstOrNull { it.id == id } ?: SYSTEM
    }
}
